import {
  ArchiveDecryptError,
  buildAad,
  CURRENT_PARAMS_VERSION,
  decryptHeader,
  encryptJson,
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

describe("encryptJson / decryptHeader", () => {
  const plaintext = JSON.stringify({ thoughts: [{ hello: "world" }] });

  test("round-trips", async () => {
    const header = await encryptJson("correct horse battery staple", plaintext);
    const decrypted = await decryptHeader(
      "correct horse battery staple",
      header
    );
    expect(decrypted).toBe(plaintext);
  });

  test("produces a fresh salt and nonce on every call (uniqueness)", async () => {
    const headers = await Promise.all(
      Array.from({ length: 20 }, () => encryptJson("same passphrase", plaintext))
    );
    const salts = new Set(headers.map((h) => h.salt));
    const nonces = new Set(headers.map((h) => h.nonce));
    expect(salts.size).toBe(20);
    expect(nonces.size).toBe(20);
  });

  test("wrong passphrase fails with the generic decrypt error", async () => {
    const header = await encryptJson("passphrase A", plaintext);
    await expect(decryptHeader("passphrase B", header)).rejects.toThrow(
      ArchiveDecryptError
    );
  });

  test("single-byte ciphertext tampering fails decryption", async () => {
    const header = await encryptJson("passphrase", plaintext);
    const bytes = require("./archive-codec").decodeBase64Strict(
      header.ciphertext
    ) as Uint8Array;
    bytes[0] ^= 0xff;
    const tampered = {
      ...header,
      ciphertext: require("./archive-codec").encodeBase64(bytes),
    };
    await expect(decryptHeader("passphrase", tampered)).rejects.toThrow(
      ArchiveDecryptError
    );
  });

  test("tampering with an AAD-covered header field fails decryption", async () => {
    const header = await encryptJson("passphrase", plaintext);

    const tamperedIterations = { ...header, iterations: header.iterations + 1 };
    await expect(
      decryptHeader("passphrase", tamperedIterations)
    ).rejects.toThrow(ArchiveDecryptError);

    // paramsVersion 2 doesn't exist in PARAMS, so this is rejected by the
    // structural paramsVersion check rather than by GCM — still proves the
    // field can't be tampered with undetected.
    const tamperedParamsVersion = {
      ...header,
      paramsVersion: header.paramsVersion + 1,
    };
    await expect(
      decryptHeader("passphrase", tamperedParamsVersion)
    ).rejects.toThrow(ArchiveDecryptError);

    // salt is AAD-covered and canonical/length-valid either way here — a
    // same-length flip keeps it structurally valid so it reaches GCM
    const saltBytes = require("./archive-codec").decodeBase64Strict(
      header.salt
    ) as Uint8Array;
    saltBytes[0] ^= 0xff;
    const tamperedSalt = {
      ...header,
      salt: require("./archive-codec").encodeBase64(saltBytes),
    };
    await expect(decryptHeader("passphrase", tamperedSalt)).rejects.toThrow(
      ArchiveDecryptError
    );
  });

  describe("AAD authentication of header.v and header.kdf", () => {
    // decryptHeader performs no structural check on `v` or `kdf` (unlike
    // `iterations`/`paramsVersion`, which are checked against the PARAMS
    // table before any KDF work runs) — these two fields are protected
    // *exclusively* by AAD authentication inside the GCM tag. Each case
    // below changes only that one field, leaving salt/nonce/ciphertext/
    // iterations/paramsVersion untouched, so a passing test here can only
    // be explained by AAD actually being checked, not by any other
    // validation path in decryptHeader.
    const tamperCases: Array<[field: "v" | "kdf", tamperedValue: string]> = [
      ["v", "Archive-v4"],
      ["kdf", "PBKDF2-SHA512"],
    ];

    test.each(tamperCases)(
      "rejects when header.%s is tampered to %s, with every other field intact",
      async (field, tamperedValue) => {
        const header = await encryptJson("passphrase", plaintext);
        const tampered = {
          ...header,
          [field]: tamperedValue,
        } as EncryptedHeaderV3;
        await expect(decryptHeader("passphrase", tampered)).rejects.toThrow(
          ArchiveDecryptError
        );
      }
    );
  });

  test("truncated ciphertext (missing tag bytes) fails decryption", async () => {
    const header = await encryptJson("passphrase", plaintext);
    const bytes = require("./archive-codec").decodeBase64Strict(
      header.ciphertext
    ) as Uint8Array;
    const truncated = bytes.slice(0, bytes.length - 4);
    const tampered = {
      ...header,
      ciphertext: require("./archive-codec").encodeBase64(truncated),
    };
    await expect(decryptHeader("passphrase", tampered)).rejects.toThrow(
      ArchiveDecryptError
    );
  });

  test("does not leak plaintext or passphrase into thrown error messages", async () => {
    const header = await encryptJson("super secret passphrase", plaintext);
    let caught: Error | undefined;
    try {
      await decryptHeader("wrong passphrase", header);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(ArchiveDecryptError);
    const message = caught!.message;
    expect(message).not.toContain("super secret passphrase");
    expect(message).not.toContain("wrong passphrase");
    expect(message).not.toContain("hello");
  });

  test("ArchiveDecryptError instances satisfy instanceof after being thrown and caught", async () => {
    const header = await encryptJson("passphrase", plaintext);
    let caught: unknown;
    try {
      await decryptHeader("wrong passphrase", header);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ArchiveDecryptError);
    expect(caught).toBeInstanceOf(Error);
  });

  test("rejects a header whose iterations disagrees with the params table, without running the KDF", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pbkdf2Module = require("@noble/hashes/pbkdf2.js");
    const spy = jest.spyOn(pbkdf2Module, "pbkdf2Async");

    const header = await encryptJson("passphrase", plaintext);
    spy.mockClear(); // encryptJson also derives a key; isolate the calls under test below

    // Positive control: proves the spy is actually observing archive-crypto.ts's
    // real production import of pbkdf2Async, not a disconnected mock — a header
    // with matching iterations must invoke the real KDF exactly once.
    await decryptHeader("passphrase", header);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();

    // Negative case under test: mismatched iterations must reject before any
    // KDF call at all.
    const tampered = { ...header, iterations: header.iterations + 1 };
    await expect(decryptHeader("passphrase", tampered)).rejects.toThrow(
      ArchiveDecryptError
    );
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  test("getRandomBytesAsync failure during export fails cleanly", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require("expo-crypto");
    const spy = jest
      .spyOn(Crypto, "getRandomBytesAsync")
      .mockRejectedValueOnce(new Error("native RNG unavailable"));
    await expect(encryptJson("passphrase", plaintext)).rejects.toThrow();
    spy.mockRestore();
  });
});
