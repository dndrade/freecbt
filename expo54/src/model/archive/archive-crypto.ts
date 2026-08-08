import {
  measureDevelopmentAsync,
  measureDevelopmentSync,
} from "@/src/debug/performance";
import { gcm } from "@noble/ciphers/aes.js";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { pbkdf2 as nativePbkdf2 } from "react-native-quick-crypto";
import {
  decodeBase64Strict,
  encodeBase64,
  utf8DecodeStrict,
  utf8Encode,
} from "./archive-codec";
import {
  CURRENT_PARAMS_VERSION,
  EncryptedHeaderV3,
  PARAMS,
} from "./archive-format";

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
 * Required AES-GCM nonce length in bytes.
 */
const NONCE_BYTES = 12;

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
  fp: string;
  salt: string;
  nonce: string;
}): Uint8Array {
  const parts = [
    h.v,
    h.kdf,
    String(h.paramsVersion),
    String(h.iterations),
    h.fp,
    h.salt,
    h.nonce,
  ];

  return new TextEncoder().encode(parts.join(AAD_SEPARATOR));
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
 * Runs PBKDF2-HMAC-SHA256 via the native `react-native-quick-crypto` module
 * (iOS/Android). Never used on web — see `pbkdf2Web`.
 */
function pbkdf2Native(
    recoveryKeyBytes: Uint8Array,
    salt: Uint8Array,
    iterations: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    nativePbkdf2(
        recoveryKeyBytes,
        salt,
        iterations,
        KEY_BYTES,
        "sha256",
        (err, derivedKey) => {
          if (err || !derivedKey) {
            reject(err ?? new Error("native PBKDF2 failed"));
            return;
          }

          resolve(Uint8Array.from(derivedKey));
        }
    );
  });
}

/**
 * Runs PBKDF2-HMAC-SHA256 via the browser's native Web Crypto API (web
 * only). `react-native-quick-crypto` has no web target, so this platform
 * needs its own path.
 */
async function pbkdf2Web(
    recoveryKeyBytes: Uint8Array,
    salt: Uint8Array,
    iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
      "raw",
      recoveryKeyBytes as BufferSource,
      "PBKDF2",
      false,
      ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
      keyMaterial,
      KEY_BYTES * 8
  );

  return new Uint8Array(bits);
}

/**
 * Derives a 256-bit AES key from a generated recovery key using
 * PBKDF2-HMAC-SHA256.
 *
 * The recovery key is converted to a temporary UTF-8 byte buffer. That buffer
 * is wiped in `finally`, regardless of whether derivation succeeds or fails.
 *
 * The recovery key, derived key, salt contents, and other secret material must
 * never be included in performance metadata or logs.
 *
 * @param operation Distinguishes encryption and decryption measurements.
 * @param recoveryKey Generated recovery key. Never logged.
 * @param salt Random archive salt or the validated salt read from a header.
 * @param iterations Code-defined iteration count selected through
 * `paramsVersion`.
 * @returns The derived 32-byte AES key.
 */
async function deriveKey(
    operation: "encrypt" | "decrypt",
    recoveryKey: string,
    salt: Uint8Array,
    iterations: number
): Promise<Uint8Array> {
  const recoveryKeyBytes = utf8Encode(recoveryKey);

  try {
    const measurement = await measureDevelopmentAsync(
        `archive.pbkdf2.${operation}`,
        () =>
            Platform.OS === "web"
                ? pbkdf2Web(recoveryKeyBytes, salt, iterations)
                : pbkdf2Native(recoveryKeyBytes, salt, iterations),
        {
          algorithm: "PBKDF2-HMAC-SHA256",
          iterations,
          saltBytes: salt.length,
          derivedKeyBytes: KEY_BYTES,
        }
    );

    return measurement.value;
  } finally {
    recoveryKeyBytes.fill(0);
  }
}

/**
 * Returns the deterministic SHA-256 fingerprint stored in Archive-v3 headers.
 *
 * The recovery key is encoded as UTF-8, hashed, Base64-encoded, and the
 * temporary UTF-8 buffer is wiped before returning.
 */
export async function keyFingerprint(recoveryKey: string): Promise<string> {
  const recoveryKeyBytes = utf8Encode(recoveryKey);

  try {
    const digest = await Crypto.digest(
      "SHA-256" as Crypto.CryptoDigestAlgorithm,
      recoveryKeyBytes as BufferSource
    );

    return encodeBase64(new Uint8Array(digest));
  } finally {
    recoveryKeyBytes.fill(0);
  }
}

/**
 * Encrypts a serialized archive JSON document into an Archive-v3 header.
 *
 * A fresh random salt and nonce are generated for every encryption. The
 * recovery-key-derived key encrypts the UTF-8 JSON bytes using AES-256-GCM,
 * while the version and KDF metadata are authenticated as AAD.
 *
 * Temporary key and plaintext buffers are wiped before returning.
 *
 * @param recoveryKey Generated recovery key. Never logged.
 * @param plaintextJson Serialized archive JSON.
 * @returns A complete Archive-v3 encrypted header.
 */
export async function encryptJson(
    recoveryKey: string,
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

    key = await deriveKey("encrypt", recoveryKey, salt, iterations);

    const plaintextMeasurement = measureDevelopmentSync(
        "archive.utf8.encode",
        () => utf8Encode(plaintextJson),
        {
          inputCharacters: plaintextJson.length,
        }
    );

    plaintextBytes = plaintextMeasurement.value;

    const fp = await keyFingerprint(recoveryKey);

    const headerMeasurement = measureDevelopmentSync(
        "archive.header.prepare",
        () => ({
          v: VERSION_V3,
          kdf: KDF_NAME,
          paramsVersion,
          iterations,
          fp,
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
 * @param recoveryKey Generated recovery key. Never logged.
 * @param header Validated Archive-v3 encrypted header.
 * @returns The decrypted archive JSON string.
 * @throws {ArchiveDecryptError} When validation, authentication, decryption,
 * or UTF-8 decoding fails.
 */
export async function decryptHeader(
    recoveryKey: string,
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

  const fp = await keyFingerprint(recoveryKey);

  if (fp !== header.fp) {
    throw new ArchiveDecryptError();
  }

  let key: Uint8Array | null = null;
  let plaintextBytes: Uint8Array | null = null;

  try {
    key = await deriveKey(
        "decrypt",
        recoveryKey,
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
          },
          // A GCM auth-tag failure here is a normal outcome (wrong
          // recovery key or tampered ciphertext) that this function already
          // converts to ArchiveDecryptError below — not a bug to flag loudly.
          { expectedFailure: true }
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