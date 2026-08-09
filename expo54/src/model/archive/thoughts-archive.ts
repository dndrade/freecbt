import * as LZ from "lz-string";
import { z } from "zod";
import * as Distortion from "../distortion";
import * as Thought from "../thought";
import {
    ArchiveDecryptError,
    RecoveryKeyFingerprintMismatchError,
    decryptHeader,
    encryptJson,
} from "./archive-crypto";
import {
    EncryptedHeaderV3,
    validateHeaderV3,
} from "./archive-format";
import {
    MAX_DECODED_TEXT_CHARS,
    MAX_ENCODED_PAYLOAD_CHARS,
    MAX_THOUGHT_COUNT,
} from "./archive-size-limits";

export const VERSION = "Archive-v2" as const;

// `v` is restricted to the known legacy version strings (or absent, for
// pre-versioning exports) rather than accepting any string. An unconstrained
// `z.string().optional()` would let an `Archive-v3` (or any other unknown
// future version) object that also happens to carry a `thoughts` field parse
// successfully here — since this schema isn't `.strict()`, the unrecognized
// encrypted-header fields (`kdf`/`paramsVersion`/`salt`/`nonce`/`ciphertext`)
// would be silently stripped, and `decodeFile` (which tries this branch
// first) would dispatch it as an empty legacy archive instead of validating
// it as encrypted.
export const LegacyJson = z.object({
  v: z.union([z.literal("Archive-v1"), z.literal("Archive-v2")]).optional(),
  // Historical archives can embed either per-thought shape `Thought.fromJson`
  // accepts (current `Thought.Json`, or the older undated `Thought.LegacyJson`
  // with object-shaped `cognitiveDistortions`). Restricting this to
  // `Thought.Json` alone would reject an otherwise-valid historical archive
  // at this outer check, before `fromJson.decode` ever reaches the
  // union-aware per-thought codec that already handles both shapes.
  thoughts: z.union([Thought.Json, Thought.LegacyJson]).array().readonly(),
});
export type LegacyJson = z.infer<typeof LegacyJson>;

export const Archive = z.object({
  thoughts: Thought.Thought.array().readonly(),
});
export type Archive = z.infer<typeof Archive>;

const affix = ":FreeCBT:";
const affixLen = affix.length;
export const jsonFromString = z.codec(
  z.string().startsWith(affix).endsWith(affix),
  LegacyJson,
  {
    decode: (enc: string) => {
      const lz = enc.substring(affix.length, enc.length - affix.length);
      const str = LZ.decompressFromBase64(lz);
      //   console.log("archive-decode", { enc, lz, str });

      // decompress returns "" on error. But "" is valid output too, since we
      // can compress ""! Special-case that one.
      if (str === null || (str === "" && lz !== "Q===")) {
        throw new Error("lz-string decompressFromBase64 failed");
      }
      return JSON.parse(str);
    },
    encode: (json: z.input<typeof LegacyJson>) => {
      const str = JSON.stringify(json);
      const lz = LZ.compressToBase64(str);
      const enc = `${affix}${lz}${affix}`;
      return enc;
    },
  }
);

export function create(thoughts: Thought.Thought[]): Archive {
  return { thoughts };
}

function buildFromJson(T: ReturnType<typeof Thought.createParsers>) {
  return z.codec(LegacyJson, Archive, {
    decode: (json: LegacyJson) => {
      const { v } = json;
      const thoughts = json.thoughts.map((t) => T.fromJson.decode(t));
      return { v, thoughts };
    },
    encode: (arc: z.input<typeof Archive>) => {
      const thoughts = Archive.decode(arc).thoughts.map((t) =>
        T.toJson.encode(t)
      );
      return { v: VERSION, thoughts };
    },
  });
}

type ArchiveFromJson = ReturnType<typeof buildFromJson>;
type ArchiveToJson = ReturnType<typeof Thought.createParsers>["toJson"];

export function createParsers(data: Distortion.Data) {
  const T = Thought.createParsers(data);
  const fromJson = buildFromJson(T);
  const fromString = jsonFromString.pipe(fromJson);
  return {
    fromJson,
    toJson: T.toJson,
    fromString,
    decodeFile: buildDecodeFile(fromJson),
    encodeEncrypted: buildEncodeEncrypted(T.toJson),
  };
}

export type DecodeFileResult =
    | { kind: "invalid"; reason: string }
    | { kind: "legacy"; archive: Archive }
    | { kind: "encrypted"; decrypt: (recoveryKey: string) => Promise<Archive> };

/**
 * Unwraps the outer :FreeCBT: envelope with hard size limits BEFORE
 * decompression/parsing, so an oversized or malicious file is rejected as
 * cheaply as possible. Does not itself validate the inner shape - callers
 * get back the parsed-but-unvalidated object plus the decoded thought-count
 * check already applied where the shape allows it.
 */
function unwrapEnvelope(
    text: string
): { ok: true; obj: unknown } | { ok: false; reason: string } {
    if (!text.startsWith(affix) || !text.endsWith(affix)) {
        return { ok: false, reason: "missing :FreeCBT: envelope" };
    }
    const lz = text.substring(affixLen, text.length - affixLen);
    if (lz.length > MAX_ENCODED_PAYLOAD_CHARS) {
        return { ok: false, reason: "encoded payload too large" };
    }
    const decompressed = LZ.decompressFromBase64(lz);
    if (decompressed === null || (decompressed === "" && lz !== "Q===")) {
        return { ok: false, reason: "lz-string decompression failed" };
    }
    if (decompressed.length > MAX_DECODED_TEXT_CHARS) {
        return { ok: false, reason: "decoded payload too large" };
    }
    let obj: unknown;
    try {
        obj = JSON.parse(decompressed);
    } catch {
        return { ok: false, reason: "invalid JSON" };
    }
    return { ok: true, obj };
}

export function createDecodeFile(data: Distortion.Data) {
    const { fromJson } = createParsers(data);
    return buildDecodeFile(fromJson);
}

function buildDecodeFile(fromJson: ArchiveFromJson) {
    return function decodeFile(text: string): DecodeFileResult {
        const unwrapped = unwrapEnvelope(text);
        if (!unwrapped.ok) return { kind: "invalid", reason: unwrapped.reason };
        const obj = unwrapped.obj;

        const legacyParsed = LegacyJson.safeParse(obj);
        if (legacyParsed.success) {
            if (legacyParsed.data.thoughts.length > MAX_THOUGHT_COUNT) {
                return { kind: "invalid", reason: "too many thoughts" };
            }
            try {
                return { kind: "legacy", archive: fromJson.decode(legacyParsed.data) };
            } catch {
                return { kind: "invalid", reason: "legacy thought decode failed" };
            }
        }

        const headerValidation = validateHeaderV3(obj);
        if (headerValidation.ok) {
            const header: EncryptedHeaderV3 = headerValidation.header;
            return {
                kind: "encrypted",
                decrypt: async (recoveryKey: string): Promise<Archive> => {
                    let plaintext: string;
                    try {
                        plaintext = await decryptHeader(recoveryKey, header);
                    } catch (error) {
                        if (error instanceof RecoveryKeyFingerprintMismatchError) {
                            throw error;
                        }

                        throw new ArchiveDecryptError();
                    }
                    let innerObj: unknown;
                    try {
                        innerObj = JSON.parse(plaintext);
                    } catch {
                        throw new ArchiveDecryptError();
                    }
                    const innerParsed = LegacyJson.safeParse(innerObj);
                    if (!innerParsed.success) throw new ArchiveDecryptError();
                    if (innerParsed.data.thoughts.length > MAX_THOUGHT_COUNT) {
                        throw new ArchiveDecryptError();
                    }
                    try {
                        // decodes every thought; throws (aborting the whole restore) if any one is malformed
                        return fromJson.decode(innerParsed.data);
                    } catch {
                        throw new ArchiveDecryptError();
                    }
                },
            };
        }

        return { kind: "invalid", reason: headerValidation.reason };
    };
}

export function createEncodeEncrypted(data: Distortion.Data) {
    const { toJson } = createParsers(data);
    return buildEncodeEncrypted(toJson);
}

function buildEncodeEncrypted(toJson: ArchiveToJson) {
    return async function encodeEncrypted(
        archive: Archive,
        recoveryKey: string
    ): Promise<string> {
        const legacyJson = {
            thoughts: archive.thoughts.map((t) => toJson.encode(t)),
        };
        const plaintext = JSON.stringify(legacyJson);
        const header = await encryptJson(recoveryKey, plaintext);
        // encryptJson has no size limit of its own; validateHeaderV3 does (the
        // same check decodeFile applies on import). Without this check, a large
        // archive could "export successfully" here and then be permanently
        // unrestorable, since decodeFile would reject the resulting file.
        if (!validateHeaderV3(header).ok) {
            throw new Error(
                "archive is too large to produce a restorable encrypted backup"
            );
        }
        const headerJson = JSON.stringify(header);
        const lz = LZ.compressToBase64(headerJson);
        return `${affix}${lz}${affix}`;
    };
}
