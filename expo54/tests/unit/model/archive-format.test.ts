import {
  CURRENT_PARAMS_VERSION,
  EncryptedHeaderV3,
  PARAMS,
  validateHeaderV3,
} from "@/src/model/archive/archive-format";
import { encodeBase64 } from "@/src/model/archive/archive-codec";

function validHeader(overrides: Partial<EncryptedHeaderV3> = {}): unknown {
  return {
    v: "Archive-v3",
    kdf: "PBKDF2-SHA256",
    fp: "kRh4sf+Uptrsq6HX72/aC5cRahYpE4lCe0AqAToq558=",
    paramsVersion: CURRENT_PARAMS_VERSION,
    iterations: PARAMS[CURRENT_PARAMS_VERSION].iterations,
    salt: encodeBase64(new Uint8Array(32).fill(7)),
    nonce: encodeBase64(new Uint8Array(12).fill(9)),
    ciphertext: encodeBase64(new Uint8Array(32).fill(1)),
    ...overrides,
  };
}

// ============================================================================
// Archive-v3 header validation
// ============================================================================

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
        validHeader({
          iterations: PARAMS[CURRENT_PARAMS_VERSION].iterations + 1,
        })
      )
    ).toEqual({ ok: false, reason: expect.any(String) });
  });

  test("rejects a salt shorter than 16 bytes", () => {
    expect(
      validateHeaderV3(
        validHeader({ salt: encodeBase64(new Uint8Array(15)) })
      )
    ).toEqual({ ok: false, reason: expect.any(String) });
  });

  test("rejects a nonce that isn't exactly 12 bytes", () => {
    expect(
      validateHeaderV3(
        validHeader({ nonce: encodeBase64(new Uint8Array(11)) })
      )
    ).toEqual({ ok: false, reason: expect.any(String) });
  });

  test("rejects ciphertext shorter than the 16-byte tag", () => {
    expect(
      validateHeaderV3(
        validHeader({ ciphertext: encodeBase64(new Uint8Array(10)) })
      )
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

  test("rejects a header missing fp", () => {
    const { fp: _fp, ...withoutFp } = validHeader() as EncryptedHeaderV3 & {
      fp?: string;
    };

    expect(validateHeaderV3(withoutFp)).toEqual({
      ok: false,
      reason: expect.any(String),
    });
  });
});
