// expo54/src/model/archive-size-limits.ts

/**
 * Decode-side safety limits for imported backup archives, used by Task 8's
 * `decodeFile` to reject anomalously large input before/after decompression.
 *
 * ## History: why these are NOT "10,000-thought worst case x 8"
 *
 * Task 4 originally tried to derive `MAX_ENCODED_PAYLOAD_CHARS` and
 * `MAX_DECODED_TEXT_CHARS` from a documented "largest realistic archive"
 * assumption (10,000 thoughts, each with three free-text fields at 20,000
 * characters) measured through the real encoder and multiplied by an 8x
 * safety factor. That approach was wrong and has been abandoned, for two
 * reasons found in review of the first version of this file:
 *
 * 1. That 10,000 x 20,000 archive decodes to ~602M JSON characters, which
 *    cannot exist as a single JS string at all: V8's own ceiling
 *    (`require("buffer").constants.MAX_STRING_LENGTH`) is 536,870,888
 *    characters (measured on Node v22.16.0, the runtime used for this
 *    task's measurements). "Worst case x 8" against an unrepresentable
 *    number produced `MAX_DECODED_TEXT_CHARS ~= 4.82 billion` - a number
 *    no real decoded string could ever reach, making the check dead code:
 *    the runtime throws `RangeError: Invalid string length` building any
 *    string anywhere near that size, long before `.length` is ever
 *    compared against the constant. The same problem applies to the
 *    encoded side: a realistic-text version of that same worst case
 *    encodes to ~132M chars, and x8 (~1.055B) *also* exceeds the V8
 *    ceiling.
 * 2. The original measurement fixture filled every field with
 *    `"x".repeat(20000)` - a single repeated character, which LZ-string
 *    compresses at roughly 500-900:1. Real journal text doesn't compress
 *    anywhere near that well (varied natural-language text typically
 *    compresses in the 2-5:1 range), so a cap calibrated against
 *    all-`"x"` filler risked false-rejecting real users' legitimate,
 *    large-but-normal archives.
 *
 * ## Current approach
 *
 * Both char-count limits are now chosen directly as round, generous,
 * *representable* ceilings, justified against two things instead of one
 * formula:
 *   (a) comfortable headroom over what a realistic real-world archive
 *       (measured through the real encoder with varied, less-compressible
 *       synthetic text - see archive-size-limits.test.ts's
 *       `realisticText` helper - at thought counts safely below the V8
 *       string-length ceiling) actually produces, and
 *   (b) a solid safety margin *below* V8's ~536,870,888-char
 *       representability ceiling, so the check can actually fire instead
 *       of being unreachable dead code.
 *
 * `MAX_DECODED_TEXT_CHARS = 64,000,000`:
 *   - anchored against this task's N=400 realistic-text measurement
 *     (24,091,631 decoded chars for 400 thoughts x 20,000-char fields) -
 *     64,000,000 is ~2.66x that reference point, comfortably admitting
 *     archives many times larger than any plausible real journal export.
 *   - leaves a ~8.4x margin below V8's 536,870,888-char ceiling
 *     (536,870,888 / 64,000,000 ~= 8.39), so the check remains meaningful:
 *     an oversized decoded payload has real room to be caught by this
 *     comparison before the runtime's own string limit would kick in.
 *
 * `MAX_ENCODED_PAYLOAD_CHARS = 32,000,000`:
 *   - anchored against this task's N=400 realistic-text measurement
 *     (5,275,918 encoded chars for the same 400-thought archive) -
 *     32,000,000 is ~6.1x that reference point.
 *   - deliberately smaller than `MAX_DECODED_TEXT_CHARS`: legitimate
 *     compression is expected to shrink real archives substantially (this
 *     task measured a stable ~4.57:1 ratio on varied synthetic text across
 *     N=100/200/400), so a real archive that would pass the decoded check
 *     should encode to well under this cap; this is a cheap pre-
 *     decompression fast-reject filter for obviously-oversized raw input,
 *     not the primary content-size guard (that's `MAX_DECODED_TEXT_CHARS`,
 *     enforced after decompression, which is what actually defends
 *     against decompression-bomb-style payloads - a small encoded input
 *     that decompresses to something huge).
 *   - leaves a ~16.8x margin below V8's string ceiling.
 *
 * `MAX_THOUGHT_COUNT = 80,000`: unaffected by the representability issue
 * above (a thought count is just a plain integer, not a string), so this
 * keeps its original derivation - the documented "largest realistic
 * archive" assumption of 10,000 thoughts, x8 safety margin.
 */
export const MAX_ENCODED_PAYLOAD_CHARS = 32_000_000;
export const MAX_DECODED_TEXT_CHARS = 64_000_000;
export const MAX_THOUGHT_COUNT = 80_000; // 10,000 assumed worst case x 8
