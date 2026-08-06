import {
  measureDevelopmentAsync,
  measureDevelopmentSync,
} from "@/src/debug/performance";
import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as Crypto from "expo-crypto";
import { z } from "zod";
import {
  decodeBase64Strict,
  encodeBase64,
  utf8DecodeStrict,
  utf8Encode,
} from "./archive-codec";

/**
 * Maximum accepted Base64 string length for each encrypted-header field
 * before attempting Base64 decoding.
 *
 * This is a defense-in-depth validation limit. It is independent of, and
 * intentionally smaller than, the archive-level size limits handled by the
 * higher-level backup parser.
 *
 * Checking encoded length before decoding prevents pathological inputs from
 * forcing unnecessary allocation or decoding work during header validation.
 *
 * Eight MiB of Base64 text is intentionally generous for a legitimate
 * FreeCBT encrypted archive field while remaining bounded against hostile
 * input.
 */
const MAX_FIELD_BASE64_CHARS = 8 * 1024 * 1024;

/**
 * ASCII Unit Separator used between fields in the canonical
 * additional-authenticated-data representation.
 *
 * The separator and field order are part of the Archive-v3 cryptographic
 * format. Changing either would cause existing archives to fail
 * authentication during decryption.
 */
const AAD_SEPARATOR = "\x1F";

/**
 * Immutable PBKDF2 parameter sets indexed by Archive-v3 `paramsVersion`.
 *
 * A file-provided iteration count must never be trusted independently.
 * Validation must:
 *
 * 1. Look up the expected iteration count using `paramsVersion`.
 * 2. Reject unsupported parameter versions.
 * 3. Reject headers whose `iterations` value does not exactly match the
 *    code-defined value for that version.
 *
 * This prevents an attacker from supplying an excessive iteration count and
 * forcing resource-intensive PBKDF2 work before authentication.
 *
 * Version 1 uses 600,000 PBKDF2-HMAC-SHA256 iterations. Device benchmarking
 * must verify whether a parameter set meets the intended interactive
 * performance target on the slowest supported device.
 *
 * Existing entries are permanent compatibility records and must never be
 * edited. Archives created with parameter version 1 must remain decryptable
 * using exactly 600,000 iterations.
 *
 * When introducing a new calibrated parameter set:
 *
 * - add a new numeric key;
 * - retain every previous entry unchanged;
 * - update `CURRENT_PARAMS_VERSION` to the new key;
 * - preserve decryption support for all earlier versions.
 *
 * A first-pass calibration may be calculated using:
 *
 * `Math.round(currentIterations * (targetMs / measuredMs))`
 *
 * That result still requires security review and device verification before
 * becoming a new format parameter set.
 */
export const PARAMS: Readonly<
    Record<number, Readonly<{ iterations: number }>>
> = {
  1: { iterations: 600_000 },
};

/**
 * Parameter-set version used when creating new Archive-v3 backups.
 *
 * Changing this value affects only newly encrypted archives. Decryption must
 * continue to support all versions present in `PARAMS`.
 */
export const CURRENT_PARAMS_VERSION = 1;

/**
 * Strict schema for the serialized Archive-v3 encrypted header.
 *
 * Unknown fields are rejected so the authenticated format remains explicit
 * and versioned.
 */
export const EncryptedHeaderV3 = z
    .object({
      v: z.literal("Archive-v3"),
      kdf: z.literal("PBKDF2-SHA256"),
      paramsVersion: z.number().int(),
      iterations: z.number().int(),
      salt: z.string(),
      nonce: z.string(),
      ciphertext: z.string(),
    })
    .strict();

export type EncryptedHeaderV3 = z.infer<typeof EncryptedHeaderV3>;

export type HeaderValidation =
    | { ok: true; header: EncryptedHeaderV3 }
    | { ok: false; reason: string };

/**
 * Minimum accepted salt length after Base64 decoding.
 */
const SALT_MIN_BYTES = 16;

/**
 * Maximum accepted salt length after Base64 decoding.
 *
 * This prevents unexpectedly large salt inputs from reaching the KDF.
 */
const SALT_MAX_BYTES = 64;

/**
 * Required AES-GCM nonce length in bytes.
 *
 * Archive-v3 uses a fresh 96-bit nonce for every encryption operation.
 */
const NONCE_BYTES = 12;

/**
 * AES-GCM authentication-tag length in bytes.
 *
 * Ciphertext shorter than this cannot contain a complete authentication tag
 * and is rejected before decryption.
 */
const GCM_TAG_BYTES = 16;

/**
 * Salt length generated for newly encrypted Archive-v3 backups.
 */
const SALT_BYTES = 32;

/**
 * Derived AES-256 key length in bytes.
 */
const KEY_BYTES = 32;

/**
 * Canonical Archive-v3 version identifier.
 */
const VERSION_V3 = "Archive-v3" as const;

/**
 * Canonical KDF identifier stored in Archive-v3 headers.
 */
const KDF_NAME = "PBKDF2-SHA256" as const;

/**
 * Builds the canonical Additional Authenticated Data for Archive-v3.
 *
 * Fields are encoded in the exact order shown and separated by the ASCII
 * Unit Separator. Do not replace this representation with `JSON.stringify`;
 * serialized object ordering or formatting differences would change the AAD
 * bytes and make existing archives fail authentication.
 */
export function buildAad(h: {
  v: "Archive-v3";
  kdf: "PBKDF2-SHA256";
  paramsVersion: number;
  iterations: number;
  salt: string;
  nonce: string;
}): Uint8Array {
  const parts = [
    h.v,
    h.kdf,
    String(h.paramsVersion),
    String(h.iterations),
    h.salt,
    h.nonce,
  ];

  return new TextEncoder().encode(parts.join(AAD_SEPARATOR));
}

/**
 * Validates all unauthenticated Archive-v3 header input before PBKDF2 runs.
 *
 * This function deliberately performs structural, parameter, encoded-length,
 * canonical-Base64, and decoded-length checks before any expensive key
 * derivation. Callers should use the returned validated header for decryption.
 */
export function validateHeaderV3(obj: unknown): HeaderValidation {
  const parsed = EncryptedHeaderV3.safeParse(obj);

  if (!parsed.success) {
    return { ok: false, reason: "malformed header" };
  }

  const h = parsed.data;
  const params = PARAMS[h.paramsVersion];

  if (params === undefined) {
    return { ok: false, reason: "unsupported paramsVersion" };
  }

  if (h.iterations !== params.iterations) {
    return {
      ok: false,
      reason: "iterations does not match paramsVersion",
    };
  }

  if (h.salt.length > MAX_FIELD_BASE64_CHARS) {
    return {
      ok: false,
      reason: "salt base64 exceeds length limit",
    };
  }

  if (h.nonce.length > MAX_FIELD_BASE64_CHARS) {
    return {
      ok: false,
      reason: "nonce base64 exceeds length limit",
    };
  }

  if (h.ciphertext.length > MAX_FIELD_BASE64_CHARS) {
    return {
      ok: false,
      reason: "ciphertext base64 exceeds length limit",
    };
  }

  const saltBytes = decodeBase64Strict(h.salt);

  if (saltBytes === null || encodeBase64(saltBytes) !== h.salt) {
    return {
      ok: false,
      reason: "salt is not canonical base64",
    };
  }

  const nonceBytes = decodeBase64Strict(h.nonce);

  if (nonceBytes === null || encodeBase64(nonceBytes) !== h.nonce) {
    return {
      ok: false,
      reason: "nonce is not canonical base64",
    };
  }

  const ciphertextBytes = decodeBase64Strict(h.ciphertext);

  if (
      ciphertextBytes === null ||
      encodeBase64(ciphertextBytes) !== h.ciphertext
  ) {
    return {
      ok: false,
      reason: "ciphertext is not canonical base64",
    };
  }

  if (
      saltBytes.length < SALT_MIN_BYTES ||
      saltBytes.length > SALT_MAX_BYTES
  ) {
    return {
      ok: false,
      reason: "salt length out of range",
    };
  }

  if (nonceBytes.length !== NONCE_BYTES) {
    return {
      ok: false,
      reason: "nonce length invalid",
    };
  }

  if (ciphertextBytes.length < GCM_TAG_BYTES) {
    return {
      ok: false,
      reason: "ciphertext shorter than the auth tag",
    };
  }

  return {
    ok: true,
    header: h,
  };
}

/**
 * Generic decryption failure exposed to callers.
 *
 * The error intentionally does not reveal whether failure came from a wrong
 * passphrase, malformed ciphertext, AAD mismatch, authentication failure, or
 * invalid plaintext encoding.
 */
export class ArchiveDecryptError extends Error {
  constructor() {
    super("archive decryption failed");

    this.name = "ArchiveDecryptError";

    /**
     * Restore the prototype chain explicitly for environments that downlevel
     * `class` syntax. This keeps `instanceof ArchiveDecryptError` reliable.
     */
    Object.setPrototypeOf(this, ArchiveDecryptError.prototype);
  }
}

/**
 * Derives a 256-bit AES key from a user-supplied passphrase using
 * PBKDF2-HMAC-SHA256.
 *
 * The passphrase is converted to a temporary UTF-8 byte buffer. That buffer
 * is wiped in `finally`, regardless of whether derivation succeeds or fails.
 *
 * The passphrase, derived key, salt contents, and other secret material must
 * never be included in performance metadata or logs.
 *
 * @param operation Distinguishes encryption and decryption measurements.
 * @param passphrase User-supplied passphrase. Never persisted or logged.
 * @param salt Random archive salt or the validated salt read from a header.
 * @param iterations Code-defined iteration count selected through
 * `paramsVersion`.
 * @returns The derived 32-byte AES key.
 */
async function deriveKey(
    operation: "encrypt" | "decrypt",
    passphrase: string,
    salt: Uint8Array,
    iterations: number
): Promise<Uint8Array> {
  const passphraseBytes = utf8Encode(passphrase);

  try {
    const measurement = await measureDevelopmentAsync(
        `archive.pbkdf2.${operation}`,
        () =>
            pbkdf2Async(sha256, passphraseBytes, salt, {
              c: iterations,
              dkLen: KEY_BYTES,
            }),
        {
          algorithm: "PBKDF2-HMAC-SHA256",
          iterations,
          saltBytes: salt.length,
          derivedKeyBytes: KEY_BYTES,
        }
    );

    return measurement.value;
  } finally {
    passphraseBytes.fill(0);
  }
}

/**
 * Encrypts a serialized archive JSON document into an Archive-v3 header.
 *
 * A fresh random salt and nonce are generated for every encryption. The
 * passphrase-derived key encrypts the UTF-8 JSON bytes using AES-256-GCM,
 * while the version and KDF metadata are authenticated as AAD.
 *
 * Temporary key and plaintext buffers are wiped before returning.
 *
 * @param passphrase User-supplied passphrase. Never persisted or logged.
 * @param plaintextJson Serialized archive JSON.
 * @returns A complete Archive-v3 encrypted header.
 */
export async function encryptJson(
    passphrase: string,
    plaintextJson: string
): Promise<EncryptedHeaderV3> {
  const paramsVersion = CURRENT_PARAMS_VERSION;
  const { iterations } = PARAMS[paramsVersion];

  let key: Uint8Array | null = null;
  let plaintextBytes: Uint8Array | null = null;

  try {
    const saltMeasurement = await measureDevelopmentAsync(
        "archive.random.salt",
        () => Crypto.getRandomBytesAsync(SALT_BYTES),
        {
          requestedBytes: SALT_BYTES,
        }
    );

    const salt = saltMeasurement.value;

    const nonceMeasurement = await measureDevelopmentAsync(
        "archive.random.nonce",
        () => Crypto.getRandomBytesAsync(NONCE_BYTES),
        {
          requestedBytes: NONCE_BYTES,
        }
    );

    const nonce = nonceMeasurement.value;

    key = await deriveKey("encrypt", passphrase, salt, iterations);

    const plaintextMeasurement = measureDevelopmentSync(
        "archive.utf8.encode",
        () => utf8Encode(plaintextJson),
        {
          inputCharacters: plaintextJson.length,
        }
    );

    plaintextBytes = plaintextMeasurement.value;

    const headerMeasurement = measureDevelopmentSync(
        "archive.header.prepare",
        () => ({
          v: VERSION_V3,
          kdf: KDF_NAME,
          paramsVersion,
          iterations,
          salt: encodeBase64(salt),
          nonce: encodeBase64(nonce),
        }),
        {
          paramsVersion,
          iterations,
          saltBytes: salt.length,
          nonceBytes: nonce.length,
        }
    );

    const headerForAad = headerMeasurement.value;

    const aadMeasurement = measureDevelopmentSync(
        "archive.aad.build",
        () => buildAad(headerForAad),
        {
          paramsVersion,
          iterations,
        }
    );

    const aad = aadMeasurement.value;

    const encryptionMeasurement = measureDevelopmentSync(
        "archive.aes-gcm.encrypt",
        () => gcm(key as Uint8Array, nonce, aad).encrypt(
            plaintextBytes as Uint8Array
        ),
        {
          algorithm: "AES-256-GCM",
          keyBytes: KEY_BYTES,
          nonceBytes: nonce.length,
          aadBytes: aad.length,
          plaintextBytes: plaintextBytes.length,
        }
    );

    const ciphertext = encryptionMeasurement.value;

    const ciphertextBase64Measurement = measureDevelopmentSync(
        "archive.base64.encode-ciphertext",
        () => encodeBase64(ciphertext),
        {
          ciphertextBytes: ciphertext.length,
        }
    );

    return {
      ...headerForAad,
      ciphertext: ciphertextBase64Measurement.value,
    };
  } finally {
    key?.fill(0);
    plaintextBytes?.fill(0);
  }
}

/**
 * Decrypts a validated Archive-v3 header and returns its UTF-8 JSON text.
 *
 * The function re-checks the code-defined parameter mapping before PBKDF2 so
 * callers cannot force arbitrary KDF work by changing values in a file.
 * Authentication and decoding failures are normalized to
 * `ArchiveDecryptError`.
 *
 * Temporary key and plaintext buffers are wiped before returning or throwing.
 *
 * @param passphrase User-supplied passphrase. Never persisted or logged.
 * @param header Validated Archive-v3 encrypted header.
 * @returns The decrypted archive JSON string.
 * @throws {ArchiveDecryptError} When validation, authentication, decryption,
 * or UTF-8 decoding fails.
 */
export async function decryptHeader(
    passphrase: string,
    header: EncryptedHeaderV3
): Promise<string> {
  const decodeMeasurement = measureDevelopmentSync(
      "archive.base64.decode-header",
      () => ({
        salt: decodeBase64Strict(header.salt),
        nonce: decodeBase64Strict(header.nonce),
        ciphertext: decodeBase64Strict(header.ciphertext),
      }),
      {
        saltCharacters: header.salt.length,
        nonceCharacters: header.nonce.length,
        ciphertextCharacters: header.ciphertext.length,
      }
  );

  const { salt, nonce, ciphertext } = decodeMeasurement.value;

  if (salt === null || nonce === null || ciphertext === null) {
    throw new ArchiveDecryptError();
  }

  const params = PARAMS[header.paramsVersion];

  if (
      params === undefined ||
      header.iterations !== params.iterations
  ) {
    throw new ArchiveDecryptError();
  }

  let key: Uint8Array | null = null;
  let plaintextBytes: Uint8Array | null = null;

  try {
    key = await deriveKey(
        "decrypt",
        passphrase,
        salt,
        params.iterations
    );

    const aadMeasurement = measureDevelopmentSync(
        "archive.aad.build",
        () => buildAad(header),
        {
          paramsVersion: header.paramsVersion,
          iterations: params.iterations,
        }
    );

    const aad = aadMeasurement.value;

    try {
      const decryptionMeasurement = measureDevelopmentSync(
          "archive.aes-gcm.decrypt",
          () => gcm(key as Uint8Array, nonce, aad).decrypt(ciphertext),
          {
            algorithm: "AES-256-GCM",
            keyBytes: KEY_BYTES,
            nonceBytes: nonce.length,
            aadBytes: aad.length,
            ciphertextBytes: ciphertext.length,
          }
      );

      plaintextBytes = decryptionMeasurement.value;
    } catch {
      throw new ArchiveDecryptError();
    }

    const decodingMeasurement = measureDevelopmentSync(
        "archive.utf8.decode",
        () => utf8DecodeStrict(plaintextBytes as Uint8Array),
        {
          plaintextBytes: plaintextBytes.length,
        }
    );

    const decoded = decodingMeasurement.value;

    if (decoded === null) {
      throw new ArchiveDecryptError();
    }

    return decoded;
  } finally {
    key?.fill(0);
    plaintextBytes?.fill(0);
  }
}