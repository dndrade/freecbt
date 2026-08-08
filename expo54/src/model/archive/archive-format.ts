import { z } from "zod";
import {
  decodeBase64Strict,
  encodeBase64,
} from "./archive-codec";

/**
 * Immutable PBKDF2 parameter sets indexed by Archive-v3 `paramsVersion`.
 *
 * Existing entries are permanent compatibility records and must never be
 * edited. Add a new numeric key for a future calibrated parameter set and
 * retain all earlier entries for decryption compatibility.
 */
export const PARAMS: Readonly<
  Record<number, Readonly<{ iterations: number }>>
> = {
  1: { iterations: 600_000 },
};

/**
 * Parameter-set version used when creating new Archive-v3 backups.
 */
export const CURRENT_PARAMS_VERSION = 1;

/**
 * Maximum accepted Base64 string length for each encrypted-header field
 * before attempting Base64 decoding.
 */
const MAX_FIELD_BASE64_CHARS = 8 * 1024 * 1024;

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
    fp: z.string(),
    salt: z.string(),
    nonce: z.string(),
    ciphertext: z.string(),
  })
  .strict();

export type EncryptedHeaderV3 = z.infer<typeof EncryptedHeaderV3>;

export type HeaderValidation =
  | { ok: true; header: EncryptedHeaderV3 }
  | { ok: false; reason: string };

const SALT_MIN_BYTES = 16;
const SALT_MAX_BYTES = 64;
const NONCE_BYTES = 12;
const GCM_TAG_BYTES = 16;

/**
 * Validates all unauthenticated Archive-v3 header input before PBKDF2 runs.
 *
 * This performs structural, parameter, encoded-length, canonical-Base64,
 * and decoded-length checks before expensive key derivation.
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
