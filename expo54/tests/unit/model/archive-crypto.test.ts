import {
    ArchiveDecryptError,
    buildAad,
    decryptHeader,
    encryptJson,
    keyFingerprint,
    RecoveryKeyFingerprintMismatchError,
} from "@/src/model/archive/archive-crypto";
import {
    EncryptedHeaderV3,
    validateHeaderV3,
} from "@/src/model/archive/archive-format";
import {
    decodeBase64Strict,
    encodeBase64,
    utf8Encode,
} from "@/src/model/archive/archive-codec";

// ============================================================================
// Shared fixtures, constants, and helper utilities
// ============================================================================

const KAT_RECOVERY_KEY =
    "7f4a2c1e9b8d6f3051728493a5b6c7d8e9f00112233445566778899aabbccdde";
const KAT_SALT = new Uint8Array(32).fill(7);
const KAT_ITERATIONS = 600_000;
const KAT_EXPECTED_HEX =
    "4925e7c97340a7616f16193abe07e31b80a755d6db84f6dc3e982e348af1b3e8";

const RECOVERY_KEY = repeatedByteRecoveryKey(0x55);
const DIFFERENT_RECOVERY_KEY = repeatedByteRecoveryKey(0x77);
const SECRET_RECOVERY_KEY = repeatedByteRecoveryKey(0x66);

function repeatedByteRecoveryKey(byte: number): string {
    return byte.toString(16).padStart(2, "0").repeat(32);
}

function tamperBase64Byte(value: string, byteIndex = 0): string {
    const bytes = decodeBase64Strict(value);

    if (bytes === null || byteIndex >= bytes.length) {
        throw new Error("test fixture is not valid Base64");
    }

    bytes[byteIndex] ^= 0xff;
    return encodeBase64(bytes);
}

// ============================================================================
// AAD canonicalization and authenticated header fields
// ============================================================================

describe("buildAad", () => {
    test("is deterministic for the same fields", () => {
        const h = {
            v: "Archive-v3" as const,
            kdf: "PBKDF2-SHA256" as const,
            paramsVersion: 1,
            iterations: 600_000,
            fp: "FFFF",
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
            fp: "FFFF",
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
            fp: "FFFF",
            salt: "AAAA",
            nonce: "BBBB",
        });

        const text = new TextDecoder().decode(aad);
        expect(text).toBe(
            "Archive-v3\x1FPBKDF2-SHA256\x1F1\x1F600000\x1FFFFF\x1FAAAA\x1FBBBB"
        );
    });

    test("includes fp in the authenticated field set", () => {
        const base = {
            v: "Archive-v3" as const,
            kdf: "PBKDF2-SHA256" as const,
            paramsVersion: 1,
            iterations: 600_000,
            fp: "AAAA",
            salt: "BBBB",
            nonce: "CCCC",
        };

        expect(buildAad(base)).not.toEqual(buildAad({ ...base, fp: "AAAB" }));
    });
});

// ============================================================================
// Recovery-key fingerprint
// ============================================================================

describe("keyFingerprint", () => {
    test("produces a deterministic SHA-256 Base64 fingerprint", async () => {
        await expect(keyFingerprint(RECOVERY_KEY)).resolves.toBe(
            "kRh4sf+Uptrsq6HX72/aC5cRahYpE4lCe0AqAToq558="
        );
    });
});

// ============================================================================
// Encryption/decryption behavior and failure boundaries
// ============================================================================

describe("encryptJson / decryptHeader", () => {
    const plaintext = JSON.stringify({ thoughts: [{ hello: "world" }] });

    // --- Core round-trip and fingerprint behavior ---------------------------------

    test("round-trips", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        const decrypted = await decryptHeader(RECOVERY_KEY, header);
        expect(decrypted).toBe(plaintext);
    });

    test("encryptJson includes the recovery-key fingerprint", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);

        await expect(keyFingerprint(RECOVERY_KEY)).resolves.toBe(header.fp);
    });

    test("rejects a recovery-key fingerprint mismatch before running PBKDF2", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const quickCryptoModule = require("react-native-quick-crypto");
        const spy = jest.spyOn(quickCryptoModule, "pbkdf2");

        const header = await encryptJson(RECOVERY_KEY, plaintext);
        spy.mockClear();

        try {
            await expect(
                decryptHeader(DIFFERENT_RECOVERY_KEY, header)
            ).rejects.toThrow(RecoveryKeyFingerprintMismatchError);

            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    // --- Randomness and Unicode handling ------------------------------------------

    test("produces a fresh salt and nonce on every call (uniqueness)", async () => {
        const headers = await Promise.all(
            Array.from({ length: 20 }, () => encryptJson(RECOVERY_KEY, plaintext))
        );
        const salts = new Set(headers.map((h) => h.salt));
        const nonces = new Set(headers.map((h) => h.nonce));
        expect(salts.size).toBe(20);
        expect(nonces.size).toBe(20);
    });

    test("round-trips Unicode archive text (accents, combining marks, emoji, CJK) byte-for-byte", async () => {
        const unicodePlaintext = JSON.stringify({
            thoughts: [
                {
                    automaticThought: "café".normalize("NFD"),
                    challenge: "🎉 emoji surrogate pair",
                    alternativeThought: "日本語のテキスト",
                },
            ],
        });

        const header = await encryptJson(RECOVERY_KEY, unicodePlaintext);
        const decrypted = await decryptHeader(RECOVERY_KEY, header);

        expect(decrypted).toBe(unicodePlaintext);
    });

    // --- Wrong-key, tamper, and generic-error behavior ----------------------------

    test("wrong recovery key fails with a fingerprint mismatch error", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        await expect(decryptHeader(DIFFERENT_RECOVERY_KEY, header)).rejects.toThrow(
            RecoveryKeyFingerprintMismatchError
        );
    });

    test("single-byte ciphertext tampering fails decryption", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        const tampered = {
            ...header,
            ciphertext: tamperBase64Byte(header.ciphertext),
        };
        await expect(decryptHeader(RECOVERY_KEY, tampered)).rejects.toThrow(
            ArchiveDecryptError
        );
    });

    test("tampering with an AAD-covered header field fails decryption", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);

        const tamperedIterations = { ...header, iterations: header.iterations + 1 };
        await expect(
            decryptHeader(RECOVERY_KEY, tamperedIterations)
        ).rejects.toThrow(ArchiveDecryptError);

        // paramsVersion 2 doesn't exist in PARAMS, so this is rejected by the
        // structural paramsVersion check rather than by GCM — still proves the
        // field can't be tampered with undetected.
        const tamperedParamsVersion = {
            ...header,
            paramsVersion: header.paramsVersion + 1,
        };
        await expect(
            decryptHeader(RECOVERY_KEY, tamperedParamsVersion)
        ).rejects.toThrow(ArchiveDecryptError);

        // salt is AAD-covered and canonical/length-valid either way here — a
        // same-length flip keeps it structurally valid so it reaches GCM
        const tamperedSalt = {
            ...header,
            salt: tamperBase64Byte(header.salt),
        };
        await expect(decryptHeader(RECOVERY_KEY, tamperedSalt)).rejects.toThrow(
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
        const tamperCases: [field: "v" | "kdf", tamperedValue: string][] = [
            ["v", "Archive-v4"],
            ["kdf", "PBKDF2-SHA512"],
        ];

        test.each(tamperCases)(
            "rejects when header.%s is tampered to %s, with every other field intact",
            async (field, tamperedValue) => {
                const header = await encryptJson(RECOVERY_KEY, plaintext);
                const tampered = {
                    ...header,
                    [field]: tamperedValue,
                } as EncryptedHeaderV3;
                await expect(decryptHeader(RECOVERY_KEY, tampered)).rejects.toThrow(
                    ArchiveDecryptError
                );
            }
        );
    });

    test("truncated ciphertext (missing tag bytes) fails decryption", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        const bytes = decodeBase64Strict(header.ciphertext);

        if (bytes === null) {
            throw new Error("test fixture is not valid Base64");
        }

        const truncated = bytes.slice(0, bytes.length - 4);
        const tampered = {
            ...header,
            ciphertext: encodeBase64(truncated),
        };
        await expect(decryptHeader(RECOVERY_KEY, tampered)).rejects.toThrow(
            ArchiveDecryptError
        );
    });

    test("does not leak plaintext or recovery key into thrown error messages", async () => {
        const header = await encryptJson(SECRET_RECOVERY_KEY, plaintext);
        let caught: Error | undefined;
        try {
            await decryptHeader(DIFFERENT_RECOVERY_KEY, header);
        } catch (e) {
            caught = e as Error;
        }
        expect(caught).toBeInstanceOf(RecoveryKeyFingerprintMismatchError);
        const message = caught!.message;
        expect(message).not.toContain(SECRET_RECOVERY_KEY);
        expect(message).not.toContain(DIFFERENT_RECOVERY_KEY);
        expect(message).not.toContain("hello");
    });

    test("ArchiveDecryptError instances satisfy instanceof after being thrown and caught", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        let caught: unknown;
        try {
            await decryptHeader(RECOVERY_KEY, {
                ...header,
                ciphertext: `${header.ciphertext.slice(0, -2)}AA`,
            });
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(ArchiveDecryptError);
        expect(caught).toBeInstanceOf(Error);
    });

    // --- KDF guardrails and native/web parity --------------------------------------

    test("rejects a header whose iterations disagrees with the params table, without running the KDF", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const quickCryptoModule = require("react-native-quick-crypto");
        const spy = jest.spyOn(quickCryptoModule, "pbkdf2");

        const header = await encryptJson(RECOVERY_KEY, plaintext);
        spy.mockClear(); // encryptJson also derives a key; isolate the calls under test below

        // Positive control: proves the spy is actually observing archive-crypto.ts's
        // real production import of pbkdf2, not a disconnected mock — a header
        // with matching iterations must invoke the real KDF exactly once.
        await decryptHeader(RECOVERY_KEY, header);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(
            expect.any(Uint8Array),
            decodeBase64Strict(header.salt),
            header.iterations,
            32,
            "sha256",
            expect.any(Function)
        );
        spy.mockClear();

        // Negative case under test: mismatched iterations must reject before any
        // KDF call at all.
        const tampered = { ...header, iterations: header.iterations + 1 };
        await expect(decryptHeader(RECOVERY_KEY, tampered)).rejects.toThrow(
            ArchiveDecryptError
        );
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });

    test("derives the expected key via the mocked react-native-quick-crypto adapter (Node crypto.pbkdf2)", async () => {
        // Direct byte-for-byte comparison against the production path's salt,
        // using the mocked native pbkdf2 (Node's crypto.pbkdf2) with the same
        // fixed salt/iterations as the KAT vector above.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { pbkdf2: mockedNativePbkdf2 } = require("react-native-quick-crypto");
        const nativeKey: Buffer = await new Promise((resolve, reject) => {
            mockedNativePbkdf2(
                utf8Encode(KAT_RECOVERY_KEY),
                KAT_SALT,
                KAT_ITERATIONS,
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
        expect(nativeKey.toString("hex")).toBe(KAT_EXPECTED_HEX);
    });

    test("web branch (crypto.subtle.deriveBits) derives the same key as the native branch", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const RN = require("react-native");
        const originalOS = RN.Platform.OS;
        RN.Platform.OS = "web";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nativeSpy = jest.spyOn(require("react-native-quick-crypto"), "pbkdf2");

        try {
            const header = await encryptJson(KAT_RECOVERY_KEY, plaintext);
            const decrypted = await decryptHeader(KAT_RECOVERY_KEY, header);
            expect(decrypted).toBe(plaintext);
            expect(nativeSpy).not.toHaveBeenCalled();

            // Direct KAT check of the web branch's own primitive, matching the
            // same known-answer vector used for the native branch above.
            const encodedRecoveryKey = utf8Encode(KAT_RECOVERY_KEY);
            const recoveryKeyBytes = new Uint8Array(encodedRecoveryKey.byteLength);
            recoveryKeyBytes.set(encodedRecoveryKey);

            const keyMaterial = await crypto.subtle.importKey(
                "raw",
                recoveryKeyBytes,
                "PBKDF2",
                false,
                ["deriveBits"]
            );
            const bits = await crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    hash: "SHA-256",
                    salt: KAT_SALT,
                    iterations: KAT_ITERATIONS,
                },
                keyMaterial,
                32 * 8
            );
            expect(Buffer.from(bits).toString("hex")).toBe(KAT_EXPECTED_HEX);
        } finally {
            RN.Platform.OS = originalOS;
            nativeSpy.mockRestore();
        }
    });

    // --- Native dependency failure and output self-validation ----------------------

    test("getRandomBytesAsync failure during export fails cleanly", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Crypto = require("expo-crypto");

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const cryptoSpy = jest
            .spyOn(Crypto, "getRandomBytesAsync")
            .mockRejectedValueOnce(new Error("native RNG unavailable"));

        try {
            await expect(
                encryptJson(RECOVERY_KEY, plaintext)
            ).rejects.toThrow();
        } finally {
            cryptoSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        }
    });

    test("encryptJson's own output passes validateHeaderV3", async () => {
        const header = await encryptJson(RECOVERY_KEY, plaintext);
        expect(validateHeaderV3(header)).toEqual({
            ok: true,
            header: expect.objectContaining({ v: "Archive-v3" }),
        });
    });
});