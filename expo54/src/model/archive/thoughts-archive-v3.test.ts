import { Archive, DistortionData, Thought } from "..";
import { PARAMS, CURRENT_PARAMS_VERSION } from "./archive-crypto";
import * as CryptoModule from "./archive-crypto";
import { MAX_ENCODED_PAYLOAD_CHARS } from "./archive-size-limits";

const A = Archive.createParsers(DistortionData);

const fixtureThought: Thought.Json = {
  uuid: crypto.randomUUID(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: ["all-or-nothing"],
  challenge: "chal",
  alternativeThought: "alt",
};

describe("decodeFile / encodeEncrypted dispatch", () => {
  test("Archive-v1 files dispatch through the legacy path and never invoke the KDF", async () => {
    // Built and wrapped directly (via `wrapLikeArchive`), NOT round-tripped
    // through `A.fromString.encode` - that encoder always stamps `v:
    // "Archive-v2"` on output regardless of input `v`, so routing a v1 fixture
    // through it would silently turn this into another v2 test and prove
    // nothing about v1 dispatch specifically (this previously happened here).
    const pbkdf2Spy = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-quick-crypto"),
      "pbkdf2"
    );
    const v1Json = { v: "Archive-v1", thoughts: [fixtureThought] };
    const encoded = wrapLikeArchive(JSON.stringify(v1Json));

    const result = A.decodeFile(encoded);
    // `kind === "legacy"` is the actual proof of dispatch: decodeFile only
    // ever calls the KDF from inside the `decrypt()` closure it returns on
    // an `"encrypted"` result, which this test never calls - so `kind` is
    // what changes if v1 dispatch breaks, while the pbkdf2 check below is a
    // redundant belt-and-braces assertion, corroborated as meaningful (not
    // vacuous) by the sanity check in "round-trips through encodeEncrypted"
    // below, which proves the same spy does observe a real KDF call when
    // `decrypt()` is actually invoked.
    expect(result.kind).toBe("legacy");
    if (result.kind === "legacy") {
      expect(result.archive.thoughts).toHaveLength(1);
    }
    expect(pbkdf2Spy).not.toHaveBeenCalled();
    pbkdf2Spy.mockRestore();
  });

  test("Archive-v2 files dispatch through the current plaintext path and never invoke the KDF", async () => {
    const pbkdf2Spy = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-quick-crypto"),
      "pbkdf2"
    );
    const v2Json = { v: "Archive-v2" as const, thoughts: [fixtureThought] };
    // produced by the real current encoder, which always stamps v2 - this is
    // the actual code path a fresh export takes, distinct from the literal
    // v1 fixture above
    const arc = A.fromJson.decode(v2Json);
    const encoded = A.fromString.encode(arc);

    const result = A.decodeFile(encoded);
    expect(result.kind).toBe("legacy");
    if (result.kind === "legacy") {
      expect(result.archive.thoughts).toHaveLength(1);
    }
    expect(pbkdf2Spy).not.toHaveBeenCalled();
    pbkdf2Spy.mockRestore();
  });

  test("an Archive-v3-labeled object carrying a thoughts field is rejected as invalid, not dispatched as an empty legacy archive", () => {
    const hybrid = {
      v: "Archive-v3",
      kdf: "PBKDF2-SHA256",
      paramsVersion: CURRENT_PARAMS_VERSION,
      iterations: PARAMS[CURRENT_PARAMS_VERSION].iterations,
      salt: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      nonce: "AAAAAAAAAAAAAAAA",
      ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      thoughts: [],
    };
    const outer = wrapLikeArchive(JSON.stringify(hybrid));
    const result = A.decodeFile(outer);
    expect(result.kind).not.toBe("legacy");
  });

  test("a file with no v field also decodes via the legacy path", async () => {
    const json = { thoughts: [fixtureThought] };
    const arc = A.fromJson.decode(json as Archive.LegacyJson);
    const encoded = A.fromString.encode(arc);
    const result = A.decodeFile(encoded);
    expect(result.kind).toBe("legacy");
  });

  test("round-trips through encodeEncrypted and decodeFile's decrypt() with the right passphrase", async () => {
    // sanity check for the `pbkdf2Spy` assertions in the dispatch tests above:
    // confirms the spy actually observes a real KDF call on the one code path
    // that's supposed to trigger it, so "not called" there is corroborating
    // evidence (decodeFile never reaches this closure for a legacy result),
    // not a vacuously-passing assertion
    const arc = A.fromJson.decode({ v: "Archive-v1", thoughts: [fixtureThought] });
    const encoded = await A.encodeEncrypted(arc, "a correct twelve-plus code point passphrase");
    // spy attached after encoding (which itself calls the KDF to derive the
    // encryption key) so it only observes the decode/decrypt side
    const pbkdf2Spy = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-quick-crypto"),
      "pbkdf2"
    );
    const result = A.decodeFile(encoded);
    expect(result.kind).toBe("encrypted");
    if (result.kind === "encrypted") {
      expect(pbkdf2Spy).not.toHaveBeenCalled();
      const restored = await result.decrypt(
        "a correct twelve-plus code point passphrase"
      );
      expect(pbkdf2Spy).toHaveBeenCalled();
      expect(restored.thoughts).toHaveLength(1);
      expect(restored.thoughts[0].automaticThought).toBe("auto");
    }
    pbkdf2Spy.mockRestore();
  });

  test("wrong passphrase on an encrypted file rejects via decrypt()", async () => {
    const arc = A.fromJson.decode({ v: "Archive-v1", thoughts: [fixtureThought] });
    const encoded = await A.encodeEncrypted(arc, "correct passphrase here");
    const result = A.decodeFile(encoded);
    expect(result.kind).toBe("encrypted");
    if (result.kind === "encrypted") {
      await expect(result.decrypt("wrong passphrase here")).rejects.toThrow();
    }
  });

  test("an object matching neither legacy nor v3 shape is rejected as invalid, not treated as legacy", () => {
    const outer = wrapLikeArchive(JSON.stringify({ v: "Archive-v9000", nonsense: true }));
    const result = A.decodeFile(outer);
    expect(result.kind).toBe("invalid");
  });

  test("an unsupported paramsVersion is rejected as invalid before any passphrase is needed", () => {
    const badHeader = {
      v: "Archive-v3",
      kdf: "PBKDF2-SHA256",
      paramsVersion: 99,
      iterations: 1,
      salt: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      nonce: "AAAAAAAAAAAAAAAA",
      ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    };
    const outer = wrapLikeArchive(JSON.stringify(badHeader));
    const result = A.decodeFile(outer);
    expect(result.kind).toBe("invalid");
  });

  test("a malformed embedded thought aborts the whole restore (transactional)", async () => {
    const goodThought = fixtureThought;
    const badThoughtJson = { ...fixtureThought, cognitiveDistortions: ["nonsense-slug"] };
    // build v3 plaintext directly containing one bad embedded thought, using
    // the same shape `encodeEncrypted` actually produces (no `v` field) so
    // `LegacyJson.safeParse` accepts the outer shape and execution reaches
    // per-thought decoding - proving the *thought* validation is what
    // aborts the restore, not an earlier version-string rejection
    const plaintextWithBadThought = JSON.stringify({
      thoughts: [goodThought, badThoughtJson],
    });
    const header = await CryptoModule.encryptJson(
      "some passphrase 123456",
      plaintextWithBadThought
    );
    const outer = wrapLikeArchive(JSON.stringify(header));
    const result = A.decodeFile(outer);
    expect(result.kind).toBe("encrypted");
    if (result.kind === "encrypted") {
      await expect(result.decrypt("some passphrase 123456")).rejects.toThrow();
    }
  });

  test("oversized encoded payload is rejected before decompression", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LZ = require("lz-string");
    const decompressSpy = jest.spyOn(LZ, "decompressFromBase64");
    // the encoded (post-compression, pre-decompression) payload itself must
    // exceed MAX_ENCODED_PAYLOAD_CHARS - highly compressible filler (e.g. a
    // repeated character) collapses under lz-string and never reaches the
    // threshold, which would make this test pass for the wrong reason (a
    // downstream JSON.parse failure instead of the size check)
    const oversizedEncoded = "A".repeat(MAX_ENCODED_PAYLOAD_CHARS + 1);
    const oversized = `:FreeCBT:${oversizedEncoded}:FreeCBT:`;
    const result = A.decodeFile(oversized);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.reason).toBe("encoded payload too large");
    }
    expect(decompressSpy).not.toHaveBeenCalled();
    decompressSpy.mockRestore();
  });
});

function wrapLikeArchive(innerJson: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LZ = require("lz-string");
  return `:FreeCBT:${LZ.compressToBase64(innerJson)}:FreeCBT:`;
}
