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
    const quickCryptoModule = require("react-native-quick-crypto");
    const spy = jest.spyOn(quickCryptoModule, "pbkdf2");

    const header = await encryptJson("passphrase", plaintext);
    spy.mockClear(); // encryptJson also derives a key; isolate the calls under test below

    // Positive control: proves the spy is actually observing archive-crypto.ts's
    // real production import of pbkdf2, not a disconnected mock — a header
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

  test("derives the same key as an independent PBKDF2-HMAC-SHA256 implementation (@noble/hashes)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pbkdf2Async } = require("@noble/hashes/pbkdf2.js");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sha256 } = require("@noble/hashes/sha2.js");
    const { utf8Encode, decodeBase64Strict } = require("./archive-codec");

    const passphrase = "correct horse battery staple";
    const salt = new Uint8Array(32).fill(7);
    const iterations = 600_000;

    // Known-answer vector: independently confirmed to match both Node's
    // built-in crypto.pbkdf2 and the browser Web Crypto API's
    // crypto.subtle.deriveBits for these exact inputs.
    const expectedHex =
      "59a9d543010c4762aac49a99f88ebb60af42c55eb3a773ef6e5b98312a567b96";

    const nobleKey = await pbkdf2Async(sha256, utf8Encode(passphrase), salt, {
      c: iterations,
      dkLen: 32,
    });
    const nobleHex = Buffer.from(nobleKey).toString("hex");
    expect(nobleHex).toBe(expectedHex);

    // The production path (native mock -> Node's crypto.pbkdf2 under Jest)
    // must derive the identical key for the identical inputs.
    const header = await encryptJson(passphrase, plaintext);
    // Re-derive directly via decryptHeader's internal path by round-tripping:
    // decrypting with the correct passphrase only succeeds if deriveKey
    // produced the same AES key encryptJson used to encrypt, which in turn
    // only happens if the native PBKDF2 path is correct — this is an
    // indirect but genuine confirmation that production's derived key
    // matches the KAT-verified value's cryptographic behavior.
    const decrypted = await decryptHeader(passphrase, header);
    expect(decrypted).toBe(plaintext);

    // Direct byte-for-byte comparison against the production path's salt,
    // using the mocked native pbkdf2 (Node's crypto.pbkdf2) with the same
    // fixed salt/iterations as the KAT vector above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pbkdf2: mockedNativePbkdf2 } = require("react-native-quick-crypto");
    const nativeKey: Buffer = await new Promise((resolve, reject) => {
      mockedNativePbkdf2(
        utf8Encode(passphrase),
        salt,
        iterations,
        32,
        "sha256",
        (err: Error | null, key?: Buffer) => {
          if (err || !key) {
            reject(err ?? new Error("pbkdf2 failed"));
            return;
          }
          resolve(key);
        }
      );
    });
    expect(nativeKey.toString("hex")).toBe(expectedHex);
  });

  test("web branch (crypto.subtle.deriveBits) derives the same key as the native branch", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RN = require("react-native");
    const originalOS = RN.Platform.OS;
    RN.Platform.OS = "web";

    try {
      const passphrase = "correct horse battery staple";
      const salt = new Uint8Array(32).fill(7);

      const header = await encryptJson(passphrase, plaintext);
      const decrypted = await decryptHeader(passphrase, header);
      expect(decrypted).toBe(plaintext);

      // Direct KAT check of the web branch's own primitive, matching the
      // same known-answer vector used for the native branch above.
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        require("./archive-codec").utf8Encode(passphrase),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations: 600_000 },
        keyMaterial,
        32 * 8
      );
      expect(Buffer.from(bits).toString("hex")).toBe(
        "59a9d543010c4762aac49a99f88ebb60af42c55eb3a773ef6e5b98312a567b96"
      );
    } finally {
      RN.Platform.OS = originalOS;
    }
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
