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
    const tampered = { ...header, iterations: header.iterations }; // baseline
    const bumpedParamsCheck = { ...header, paramsVersion: header.paramsVersion };
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
    void tampered;
    void bumpedParamsCheck;
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
    try {
      await decryptHeader("wrong passphrase", header);
      throw new Error("expected decryptHeader to throw");
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toContain("super secret passphrase");
      expect(message).not.toContain("wrong passphrase");
      expect(message).not.toContain("hello");
    }
  });

  test("rejects a header whose iterations disagrees with the params table, without running the KDF", async () => {
    const header = await encryptJson("passphrase", plaintext);
    const tampered = { ...header, iterations: header.iterations + 1 };
    const start = Date.now();
    await expect(decryptHeader("passphrase", tampered)).rejects.toThrow(
      ArchiveDecryptError
    );
    // A real PBKDF2 run at 600,000 iterations takes ~5-6s in this suite
    // (see the other tests' timings); this must reject well before that,
    // proving the iterations check fires before any KDF work runs.
    expect(Date.now() - start).toBeLessThan(1000);
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
