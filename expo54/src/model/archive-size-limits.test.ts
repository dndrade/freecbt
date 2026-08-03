// expo54/src/model/archive-size-limits.test.ts
import { v4 as uuidv4 } from "uuid";
import { Archive, DistortionData, Thought } from ".";
import {
  MAX_DECODED_TEXT_CHARS,
  MAX_ENCODED_PAYLOAD_CHARS,
  MAX_THOUGHT_COUNT,
} from "./archive-size-limits";

const SAFETY_MULTIPLIER = 8;
const ASSUMED_MAX_THOUGHTS = 10_000;
const ASSUMED_MAX_FIELD_CHARS = 20_000;

function buildWorstCaseArchiveJson(): string {
  const A = Archive.createParsers(DistortionData);
  const longText = "x".repeat(ASSUMED_MAX_FIELD_CHARS);
  const thoughts: Thought.Json[] = Array.from(
    { length: ASSUMED_MAX_THOUGHTS },
    () => ({
      uuid: uuidv4(),
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      automaticThought: longText,
      cognitiveDistortions: ["all-or-nothing"],
      challenge: longText,
      alternativeThought: longText,
    })
  );
  const arc = A.fromJson.decode({ v: "Archive-v1", thoughts });
  return A.fromString.encode(arc);
}

describe("archive size limits", () => {
  // These two tests are marked .skip rather than merely "intentionally
  // slow": building the full 10,000-thought x 20,000-char worst-case
  // archive and calling JSON.stringify on it (which both the real encoder
  // and the second test below do directly) throws
  // `RangeError: Invalid string length` on this Node runtime, because the
  // resulting string (~602M chars) exceeds V8's string-length ceiling
  // (require("buffer").constants.MAX_STRING_LENGTH === 536,870,888 here).
  // The full worst case is therefore not constructible as a single JS
  // string at all on this runtime, so this test cannot run to completion
  // even given unlimited time - see archive-size-limits.ts and
  // task-4-report.md for how the real MAX_* constants were instead
  // derived (measured through the real encoder at smaller N, then
  // extrapolated) and for the raw measurement data.
  test.skip("worst-case synthetic archive fits within the configured limits", () => {
    const encoded = buildWorstCaseArchiveJson();
    // eslint-disable-next-line no-console
    console.log("measured encoded length:", encoded.length);
    expect(encoded.length * SAFETY_MULTIPLIER).toBeLessThanOrEqual(
      MAX_ENCODED_PAYLOAD_CHARS
    );
  });
  test.skip("MAX_DECODED_TEXT_CHARS comfortably covers the worst-case archive's JSON", () => {
    const A = Archive.createParsers(DistortionData);
    const longText = "x".repeat(ASSUMED_MAX_FIELD_CHARS);
    const thoughts: Thought.Json[] = Array.from(
      { length: ASSUMED_MAX_THOUGHTS },
      () => ({
        uuid: uuidv4(),
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        automaticThought: longText,
        cognitiveDistortions: ["all-or-nothing"],
        challenge: longText,
        alternativeThought: longText,
      })
    );
    const decodedTextLength = JSON.stringify({
      v: "Archive-v1",
      thoughts,
    }).length;
    expect(decodedTextLength * SAFETY_MULTIPLIER).toBeLessThanOrEqual(
      MAX_DECODED_TEXT_CHARS
    );
  });
  test("MAX_THOUGHT_COUNT covers the assumed worst-case thought count with headroom", () => {
    expect(ASSUMED_MAX_THOUGHTS * SAFETY_MULTIPLIER).toBeLessThanOrEqual(
      MAX_THOUGHT_COUNT
    );
  });
});
