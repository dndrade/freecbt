// expo54/src/model/archive-size-limits.ts

/**
 * Derived from Task 4's worst-case synthetic archive assumption: 10,000
 * thoughts, each with three free-text fields (`automaticThought`,
 * `challenge`, `alternativeThought`) at 20,000 characters each (see
 * archive-size-limits.test.ts and
 * docs/superpowers/specs/2026-08-03-encrypted-backup-archive-design.md,
 * "Archive size limits").
 *
 * IMPORTANT CAVEAT discovered while measuring (see task-4-report.md for
 * full detail): building that exact 10,000 x 20,000 archive and calling
 * `JSON.stringify` on it - which is what both the real encoder
 * (`Archive.fromString.encode`) and the decoded-text-size test do -
 * throws `RangeError: Invalid string length` in this Node runtime, because
 * the resulting string (~602M chars) exceeds V8's hard ceiling
 * (`require("buffer").constants.MAX_STRING_LENGTH` = 536,870,888 on the
 * Node version used for this measurement, Node v22.16.0). The full
 * worst-case archive is therefore NOT constructible as a single JS string
 * on this runtime at all, let alone measurable end-to-end through the real
 * encoder at N=10,000.
 *
 * To still produce real numbers from real code (not guesses), the encoder
 * was run at smaller thought counts (N=100, 200, 400 - all safely under
 * the string-length ceiling) via `Archive.createParsers(DistortionData)`,
 * and the results were used to derive the N=10,000 figures below:
 *
 *   - Decoded (uncompressed) JSON length is exactly linear in N (verified
 *     across all three measured points to within a fixed +31-char
 *     wrapper): decodedChars(N) = 60,229 * N + 31. This is an exact
 *     formula, not an approximation - extrapolating it to N=10,000 gives
 *     decodedChars(10,000) = 602,290,031.
 *   - Encoded (LZ-string-compressed) length is sub-linear in N (highly
 *     repetitive filler compresses better as N grows: 11,994 chars at
 *     N=100, 17,350 at N=200, 26,254 at N=400). Because true compression
 *     behavior is sub-linear, extrapolating using the *average* chars/
 *     thought ratio from the largest safely-measured point (N=400:
 *     26,254 / 400 = 65.635 chars/thought) and scaling that flat ratio up
 *     to N=10,000 deliberately overestimates the real compressed size,
 *     which is the safe direction for a safety ceiling:
 *     encodedChars(10,000) ~= 65.635 * 10,000 = 656,350.
 *
 * Both figures are then multiplied by the 8x SAFETY_MULTIPLIER used
 * throughout archive-size-limits.test.ts.
 *
 *   MAX_ENCODED_PAYLOAD_CHARS = 656,350 * 8    = 5,250,800
 *   MAX_DECODED_TEXT_CHARS    = 602,290,031 * 8 = 4,818,320,248
 *   MAX_THOUGHT_COUNT         = 10,000 * 8      = 80,000
 *
 * Note MAX_DECODED_TEXT_CHARS (~4.8 billion) is itself far larger than
 * any JS engine can ever materialize as a single string (V8's own ceiling
 * here is ~537 million characters) - see task-4-report.md for why this is
 * flagged as a concern for Task 8's decodeFile to be aware of: on this
 * runtime, an oversized decoded payload will hit the engine's own string
 * limit (and throw RangeError) before this numeric comparison ever gets a
 * chance to reject it.
 */
export const MAX_ENCODED_PAYLOAD_CHARS = 5_250_800;
export const MAX_DECODED_TEXT_CHARS = 4_818_320_248;
export const MAX_THOUGHT_COUNT = 80_000; // 10,000 assumed worst case x 8
