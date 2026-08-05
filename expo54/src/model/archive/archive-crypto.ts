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

// Defense-in-depth sanity cap on base64 string length before decoding. This is
// independent of and smaller than the archive-level limit that Task 4/8 will
// define — this is just to prevent pathological inputs from consuming resources
// in the validation stage itself. 8 MiB of base64 text is generous for any real
// ciphertext, tiny compared to a hostile input.
const MAX_FIELD_BASE64_CHARS = 8 * 1024 * 1024;

const AAD_SEPARATOR = "\x1F";

// One fixed, benchmarked iteration count per paramsVersion. Never trust an
// iteration count read from a file — always look it up here by
// paramsVersion, and reject any file whose stated `iterations` doesn't
// match. This closes the resource-exhaustion route entirely rather than
// merely bounding it (see design spec, "Pre-KDF validation").
//
// 600,000 is OWASP's 2023 minimum recommendation for PBKDF2-HMAC-SHA256.
// Manual device verification (see plan Task 13) must confirm this lands
// in the 250-500ms target window (design spec, "Performance target") on
// the slowest officially supported device. If it doesn't, add a NEW
// entry with a NEW paramsVersion key holding the corrected iteration
// count — computed as `Math.round(600_000 * (targetMs / measuredMs))` —
// and bump CURRENT_PARAMS_VERSION to point at it. Never edit an existing
// entry: archives already encrypted under paramsVersion 1 must stay
// decryptable at exactly 600,000 iterations.
export const PARAMS: Record<number, { iterations: number }> = {
  1: { iterations: 600_000 },
};
export const CURRENT_PARAMS_VERSION = 1;

export const EncryptedHeaderV3 = z.object({
  v: z.literal("Archive-v3"),
  kdf: z.literal("PBKDF2-SHA256"),
  paramsVersion: z.number().int(),
  iterations: z.number().int(),
  salt: z.string(),
  nonce: z.string(),
  ciphertext: z.string(),
}).strict();
export type EncryptedHeaderV3 = z.infer<typeof EncryptedHeaderV3>;

export type HeaderValidation =
  | { ok: true; header: EncryptedHeaderV3 }
  | { ok: false; reason: string };

const SALT_MIN_BYTES = 16;
const SALT_MAX_BYTES = 64;
const NONCE_BYTES = 12;
const GCM_TAG_BYTES = 16;

/** Fields covered by AAD, in this exact order — never JSON.stringify. */
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

/** All unauthenticated-input checks that must pass before any PBKDF2 work runs. */
export function validateHeaderV3(obj: unknown): HeaderValidation {
  const parsed = EncryptedHeaderV3.safeParse(obj);
  if (!parsed.success) return { ok: false, reason: "malformed header" };
  const h = parsed.data;

  const params = PARAMS[h.paramsVersion];
  if (params === undefined) {
    return { ok: false, reason: "unsupported paramsVersion" };
  }
  if (h.iterations !== params.iterations) {
    return { ok: false, reason: "iterations does not match paramsVersion" };
  }

  // Defense-in-depth: check base64 string length before decoding
  if (h.salt.length > MAX_FIELD_BASE64_CHARS) {
    return { ok: false, reason: "salt base64 exceeds length limit" };
  }
  if (h.nonce.length > MAX_FIELD_BASE64_CHARS) {
    return { ok: false, reason: "nonce base64 exceeds length limit" };
  }
  if (h.ciphertext.length > MAX_FIELD_BASE64_CHARS) {
    return { ok: false, reason: "ciphertext base64 exceeds length limit" };
  }

  // Decode each field once and verify canonicality via re-encoding
  const saltBytes = decodeBase64Strict(h.salt);
  if (saltBytes === null || encodeBase64(saltBytes) !== h.salt) {
    return { ok: false, reason: "salt is not canonical base64" };
  }
  const nonceBytes = decodeBase64Strict(h.nonce);
  if (nonceBytes === null || encodeBase64(nonceBytes) !== h.nonce) {
    return { ok: false, reason: "nonce is not canonical base64" };
  }
  const ciphertextBytes = decodeBase64Strict(h.ciphertext);
  if (ciphertextBytes === null || encodeBase64(ciphertextBytes) !== h.ciphertext) {
    return { ok: false, reason: "ciphertext is not canonical base64" };
  }

  // Validate decoded byte lengths
  if (saltBytes.length < SALT_MIN_BYTES || saltBytes.length > SALT_MAX_BYTES) {
    return { ok: false, reason: "salt length out of range" };
  }
  if (nonceBytes.length !== NONCE_BYTES) {
    return { ok: false, reason: "nonce length invalid" };
  }
  if (ciphertextBytes.length < GCM_TAG_BYTES) {
    return { ok: false, reason: "ciphertext shorter than the auth tag" };
  }
  return { ok: true, header: h };
}

const SALT_BYTES = 32;
const KEY_BYTES = 32;
// NONCE_BYTES is already declared above (used by validateHeaderV3) — reuse
// it here rather than redeclaring.
const VERSION_V3 = "Archive-v3" as const;
const KDF_NAME = "PBKDF2-SHA256" as const;

export class ArchiveDecryptError extends Error {
  constructor() {
    // no plaintext, passphrase, or underlying library error text — ever
    super("archive decryption failed");
    this.name = "ArchiveDecryptError";
    // Restore the prototype chain explicitly. If this file is ever compiled
    // to a target that downlevels `class` syntax to the ES5 function/
    // prototype pattern, `super(message)` alone would leave `instanceof
    // ArchiveDecryptError` false for thrown instances.
    Object.setPrototypeOf(this, ArchiveDecryptError.prototype);
  }
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const passphraseBytes = utf8Encode(passphrase);
  try {
    return await pbkdf2Async(sha256, passphraseBytes, salt, {
      c: iterations,
      dkLen: KEY_BYTES,
    });
  } finally {
    passphraseBytes.fill(0);
  }
}

export async function encryptJson(
  passphrase: string,
  plaintextJson: string
): Promise<EncryptedHeaderV3> {
  const paramsVersion = CURRENT_PARAMS_VERSION;
  const { iterations } = PARAMS[paramsVersion];
  let key: Uint8Array | null = null;
  let plaintextBytes: Uint8Array | null = null;
  try {
    const salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
    const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
    key = await deriveKey(passphrase, salt, iterations);
    plaintextBytes = utf8Encode(plaintextJson);
    const headerForAad = {
      v: VERSION_V3,
      kdf: KDF_NAME,
      paramsVersion,
      iterations,
      salt: encodeBase64(salt),
      nonce: encodeBase64(nonce),
    };
    const aad = buildAad(headerForAad);
    const ciphertext = gcm(key, nonce, aad).encrypt(plaintextBytes);
    return { ...headerForAad, ciphertext: encodeBase64(ciphertext) };
  } finally {
    key?.fill(0);
    plaintextBytes?.fill(0);
  }
}

export async function decryptHeader(
  passphrase: string,
  header: EncryptedHeaderV3
): Promise<string> {
  const salt = decodeBase64Strict(header.salt);
  const nonce = decodeBase64Strict(header.nonce);
  const ciphertext = decodeBase64Strict(header.ciphertext);
  if (salt === null || nonce === null || ciphertext === null) {
    throw new ArchiveDecryptError();
  }
  // Never trust `header.iterations` from the file — always look up the
  // fixed, code-defined value by paramsVersion, and reject any mismatch
  // before running the (expensive) KDF. See PARAMS's comment above.
  const params = PARAMS[header.paramsVersion];
  if (params === undefined || header.iterations !== params.iterations) {
    throw new ArchiveDecryptError();
  }
  let key: Uint8Array | null = null;
  let plaintextBytes: Uint8Array | null = null;
  try {
    key = await deriveKey(passphrase, salt, params.iterations);
    const aad = buildAad(header);
    try {
      plaintextBytes = gcm(key, nonce, aad).decrypt(ciphertext);
    } catch {
      throw new ArchiveDecryptError();
    }
    const decoded = utf8DecodeStrict(plaintextBytes);
    if (decoded === null) throw new ArchiveDecryptError();
    return decoded;
  } finally {
    key?.fill(0);
    plaintextBytes?.fill(0);
  }
}
