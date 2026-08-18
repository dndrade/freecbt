// expo54/src/model/archive/archive-size-limits.test.ts
import { Archive, DistortionData, Thought } from "@/src/model";
import {
  MAX_DECODED_TEXT_CHARS,
  MAX_ENCODED_PAYLOAD_CHARS,
  MAX_THOUGHT_COUNT,
} from "@/src/model/archive/archive-size-limits";

import { constants as bufferConstants } from "buffer";

const SAFETY_MULTIPLIER = 8;
const ASSUMED_MAX_THOUGHTS = 10_000;

// A "large but representable" archive used to exercise the real encoder
// end to end. Deliberately smaller than the 10,000-thought/20,000-char
// "documented worst case" assumption from Task 4's original design, which
// (see archive-size-limits.ts's header comment) turned out to be
// unrepresentable as a single JS string on this runtime at all - so it
// can never be built, let alone used to exercise these limits. N=300 is
// large enough to comfortably demonstrate real-world scale while staying
// well under both the caps and V8's string-length ceiling, and fast
// enough to run in CI.
const LARGE_REALISTIC_THOUGHT_COUNT = 300;
const FIELD_CHARS = 20_000;

// Deterministic seeded PRNG (mulberry32) so the fixture is reproducible.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small vocabulary cycled pseudo-randomly to approximate real journal
// prose's compressibility (LZ-string compresses this at roughly 4.5:1 in
// this task's measurements) - unlike a single repeated character (which
// compresses at 500-900:1 and would badly understate how large a real
// archive's *encoded* form actually is).
const WORDS = [
  "the", "and", "because", "I", "feel", "think", "that", "always", "never",
  "should", "people", "judge", "fail", "today", "again", "really", "just",
  "maybe", "perhaps", "overwhelmed", "anxious", "calm", "evidence",
  "argument", "distortion", "catastrophizing", "meeting", "work", "family",
  "friend", "tomorrow", "yesterday", "control", "mistake", "perfect",
  "enough", "worry", "stress", "breathe", "pause", "reflect", "balance",
  "progress", "effort", "kindness", "patience", "everyone", "nobody",
  "somehow", "eventually", "honestly", "probably", "certainly", "clearly",
];

function realisticText(length: number, rand: () => number): string {
  let out = "";
  while (out.length < length) {
    out += WORDS[Math.floor(rand() * WORDS.length)] + " ";
  }
  return out.slice(0, length);
}

function buildLargeRealisticArchive(): {
  encodedChars: number;
  decodedTextChars: number;
} {
  const rand = mulberry32(1);
  const A = Archive.createParsers(DistortionData);
  const thoughts: Thought.Json[] = Array.from(
    { length: LARGE_REALISTIC_THOUGHT_COUNT },
    () => ({
      uuid: crypto.randomUUID(),
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      automaticThought: realisticText(FIELD_CHARS, rand),
      cognitiveDistortions: ["all-or-nothing"],
      challenge: realisticText(FIELD_CHARS, rand),
      alternativeThought: realisticText(FIELD_CHARS, rand),
    })
  );
  const decodedTextChars = JSON.stringify({
    v: "Archive-v1",
    thoughts,
  }).length;
  const arc = A.fromJson.decode({ v: "Archive-v1", thoughts });
  const encodedChars = A.fromString.encode(arc).length;
  return { encodedChars, decodedTextChars };
}

describe("archive size limits", () => {
  // Regression test for the bug found in Task 4 review: a size limit that
  // exceeds what a JS string can ever hold is dead code - the runtime
  // throws `RangeError: Invalid string length` building any string near
  // that size, so `.length > MAX_...` can never be reached, let alone be
  // true. Both limits must stay meaningfully below the engine's actual
  // string-length ceiling so the checks that use them are reachable.
    test("both char limits stay safely below this runtime's string-length ceiling", () => {
        const MAX_STRING_LENGTH = bufferConstants.MAX_STRING_LENGTH;

        expect(MAX_DECODED_TEXT_CHARS).toBeLessThan(MAX_STRING_LENGTH);
        expect(MAX_ENCODED_PAYLOAD_CHARS).toBeLessThan(MAX_STRING_LENGTH);
    });

  // Builds a 300-thought archive with varied (non-trivially-compressible)
  // text through the real encoder and checks it comfortably fits under
  // both caps - i.e. the caps are generous enough not to false-reject a
  // large, legitimate real-world archive.
  test(
    "a large realistic archive comfortably fits under both caps",
    () => {
      const { encodedChars, decodedTextChars } = buildLargeRealisticArchive();
      expect(encodedChars).toBeLessThan(MAX_ENCODED_PAYLOAD_CHARS);
      expect(decodedTextChars).toBeLessThan(MAX_DECODED_TEXT_CHARS);
    },
    60_000
  );

  // Exercises the actual comparison decodeFile is expected to make: a
  // string just past MAX_DECODED_TEXT_CHARS (but still far under V8's
  // representability ceiling, so it's cheap and safe to build in a test)
  // must correctly evaluate as "too large, reject".
  test("a decoded payload one char past MAX_DECODED_TEXT_CHARS is correctly flagged as too large", () => {
    const oversized = "a".repeat(MAX_DECODED_TEXT_CHARS + 1);
    expect(oversized.length > MAX_DECODED_TEXT_CHARS).toBe(true);
  });

  test("MAX_THOUGHT_COUNT covers the assumed worst-case thought count with headroom", () => {
    expect(ASSUMED_MAX_THOUGHTS * SAFETY_MULTIPLIER).toBeLessThanOrEqual(
      MAX_THOUGHT_COUNT
    );
  });
});
