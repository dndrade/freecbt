import {
  buildAad,
  CURRENT_PARAMS_VERSION,
  EncryptedHeaderV3,
  PARAMS,
  validateHeaderV3,
} from "./archive-crypto";
import { encodeBase64 } from "./archive-codec";

function validHeader(overrides: Partial<EncryptedHeaderV3> = {}): unknown {
  return {
    v: "Archive-v3",
    kdf: "PBKDF2-SHA256",
    paramsVersion: CURRENT_PARAMS_VERSION,
    iterations: PARAMS[CURRENT_PARAMS_VERSION].iterations,
    salt: encodeBase64(new Uint8Array(32).fill(7)),
    nonce: encodeBase64(new Uint8Array(12).fill(9)),
    ciphertext: encodeBase64(new Uint8Array(32).fill(1)),
    ...overrides,
  };
}

describe("buildAad", () => {
  test("is deterministic for the same fields", () => {
    const h = {
      v: "Archive-v3" as const,
      kdf: "PBKDF2-SHA256" as const,
      paramsVersion: 1,
      iterations: 600_000,
      salt: "AAAA",
      nonce: "BBBB",
    };
    expect(buildAad(h)).toEqual(buildAad({ ...h }));
  });
  test("differs when any field changes", () => {
    const base = {
      v: "Archive-v3" as const,
      kdf: "PBKDF2-SHA256" as const,
      paramsVersion: 1,
      iterations: 600_000,
      salt: "AAAA",
      nonce: "BBBB",
    };
    const changedIterations = buildAad({ ...base, iterations: 600_001 });
    const changedSalt = buildAad({ ...base, salt: "AAAB" });
    const original = buildAad(base);
    expect(changedIterations).not.toEqual(original);
    expect(changedSalt).not.toEqual(original);
  });
  test("uses the unit-separator between fields, not JSON", () => {
    const aad = buildAad({
      v: "Archive-v3",
      kdf: "PBKDF2-SHA256",
      paramsVersion: 1,
      iterations: 600_000,
      salt: "AAAA",
      nonce: "BBBB",
    });
    const text = new TextDecoder().decode(aad);
    expect(text).toBe("Archive-v3\x1FPBKDF2-SHA256\x1F1\x1F600000\x1FAAAA\x1FBBBB");
  });
});

describe("validateHeaderV3", () => {
  test("accepts a well-formed header", () => {
    expect(validateHeaderV3(validHeader())).toEqual({
      ok: true,
      header: expect.objectContaining({ v: "Archive-v3" }),
    });
  });
  test("rejects an unrecognized v", () => {
    expect(validateHeaderV3(validHeader({ v: "Archive-v4" as any }))).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
  test("rejects an unsupported kdf", () => {
    expect(validateHeaderV3(validHeader({ kdf: "bcrypt" as any }))).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
  test("rejects an unknown paramsVersion", () => {
    expect(validateHeaderV3(validHeader({ paramsVersion: 99 }))).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
  test("rejects iterations that don't match the fixed value for paramsVersion", () => {
    expect(
      validateHeaderV3(
        validHeader({ iterations: PARAMS[CURRENT_PARAMS_VERSION].iterations + 1 })
      )
    ).toEqual({ ok: false, reason: expect.any(String) });
  });
  test("rejects a salt shorter than 16 bytes", () => {
    expect(
      validateHeaderV3(validHeader({ salt: encodeBase64(new Uint8Array(15)) }))
    ).toEqual({ ok: false, reason: expect.any(String) });
  });
  test("rejects a nonce that isn't exactly 12 bytes", () => {
    expect(
      validateHeaderV3(validHeader({ nonce: encodeBase64(new Uint8Array(11)) }))
    ).toEqual({ ok: false, reason: expect.any(String) });
  });
  test("rejects ciphertext shorter than the 16-byte tag", () => {
    expect(
      validateHeaderV3(validHeader({ ciphertext: encodeBase64(new Uint8Array(10)) }))
    ).toEqual({ ok: false, reason: expect.any(String) });
  });
  test("rejects non-canonical base64 in salt/nonce/ciphertext", () => {
    expect(validateHeaderV3(validHeader({ salt: "not-base64!!" }))).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
  test("rejects a malformed object entirely", () => {
    expect(validateHeaderV3({ nonsense: true })).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
});
