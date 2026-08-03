import { z } from "zod";
import { decodeBase64Strict, encodeBase64, isCanonicalBase64 } from "./archive-codec";

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
});
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
  if (!isCanonicalBase64(h.salt)) {
    return { ok: false, reason: "salt is not canonical base64" };
  }
  if (!isCanonicalBase64(h.nonce)) {
    return { ok: false, reason: "nonce is not canonical base64" };
  }
  if (!isCanonicalBase64(h.ciphertext)) {
    return { ok: false, reason: "ciphertext is not canonical base64" };
  }
  const saltBytes = decodeBase64Strict(h.salt)!;
  const nonceBytes = decodeBase64Strict(h.nonce)!;
  const ciphertextBytes = decodeBase64Strict(h.ciphertext)!;
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
