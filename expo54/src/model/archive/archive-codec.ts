import { measureDevelopmentSync } from "@/src/debug/performance";
import { debugLoggingAllows } from "@/src/debug/logging";

/**
 * Canonical Base64 alphabet used by Archive-v3.
 *
 * The codec intentionally avoids platform-specific `atob`/`btoa` behavior so
 * encoded archives remain deterministic across React Native, web, and tests.
 */
const BASE64_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Reverse lookup table for strict Base64 decoding.
 */
const BASE64_LOOKUP = new Map<string, number>(
    Array.from(BASE64_CHARS).map((character, index) => [character, index])
);

/**
 * Encodes bytes as canonical padded Base64 without instrumentation.
 *
 * Kept separate from the exported wrapper so compound codec operations can
 * avoid producing duplicate nested measurements.
 */
function encodeBase64Raw(bytes: Uint8Array): string {
  let result = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? bytes[i + 1] : 0;
    const b2 = hasB2 ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;

    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    result += hasB1 ? BASE64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += hasB2 ? BASE64_CHARS[triplet & 0x3f] : "=";
  }

  return result;
}

/**
 * Strictly decodes canonical-shape Base64 without instrumentation.
 *
 * Returns `null` for malformed input rather than accepting permissive or
 * platform-dependent variants.
 */
function decodeBase64StrictRaw(s: string): Uint8Array | null {
  if (s.length === 0) {
    return new Uint8Array(0);
  }

  if (s.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
    return null;
  }

  const paddingLen = (s.match(/=*$/) ?? [""])[0].length;
  const core = s.slice(0, s.length - paddingLen);

  if (core.includes("=")) {
    return null;
  }

  const bytesLen = (s.length / 4) * 3 - paddingLen;
  const out = new Uint8Array(bytesLen);
  let outIdx = 0;

  for (let i = 0; i < s.length; i += 4) {
    const c2raw = s[i + 2];
    const c3raw = s[i + 3];
    const c0 = BASE64_LOOKUP.get(s[i]);
    const c1 = BASE64_LOOKUP.get(s[i + 1]);
    const c2 = c2raw === "=" ? 0 : BASE64_LOOKUP.get(c2raw);
    const c3 = c3raw === "=" ? 0 : BASE64_LOOKUP.get(c3raw);

    if (
        c0 === undefined ||
        c1 === undefined ||
        c2 === undefined ||
        c3 === undefined
    ) {
      return null;
    }

    const triplet = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    if (outIdx < bytesLen) {
      out[outIdx++] = (triplet >> 16) & 0xff;
    }

    if (outIdx < bytesLen) {
      out[outIdx++] = (triplet >> 8) & 0xff;
    }

    if (outIdx < bytesLen) {
      out[outIdx++] = triplet & 0xff;
    }
  }

  return out;
}

/**
 * Encodes a byte array as canonical padded Base64.
 *
 * Development measurements log only input and output lengths.
 */
export function encodeBase64(bytes: Uint8Array): string {
  return measureDevelopmentSync(
      "archive.codec.base64.encode",
      () => encodeBase64Raw(bytes),
      {
        inputBytes: bytes.length,
        expectedOutputCharacters: Math.ceil(bytes.length / 3) * 4,
      }
  ).value;
}

/**
 * Strictly decodes a canonical-shape Base64 string.
 *
 * Returns `null` for malformed input. Development measurements do not log the
 * encoded value, only its length and whether decoding succeeded.
 */
export function decodeBase64Strict(s: string): Uint8Array | null {
  const measurement = measureDevelopmentSync(
      "archive.codec.base64.decode",
      () => decodeBase64StrictRaw(s),
      {
        inputCharacters: s.length,
      }
  );

  if (debugLoggingAllows("debug")) {
    console.log("[performance] archive.codec.base64.decode result", {
      success: measurement.value !== null,
      outputBytes: measurement.value?.length ?? 0,
    });
  }

  return measurement.value;
}

/**
 * Returns whether a string is canonical padded Base64.
 *
 * Canonicality requires strict decoding followed by byte-for-byte-equivalent
 * re-encoding. Raw codec functions are used internally to avoid duplicate
 * nested timing records.
 */
export function isCanonicalBase64(s: string): boolean {
  return measureDevelopmentSync(
      "archive.codec.base64.canonical-check",
      () => {
        const decoded = decodeBase64StrictRaw(s);
        return decoded !== null && encodeBase64Raw(decoded) === s;
      },
      {
        inputCharacters: s.length,
      }
  ).value;
}

/**
 * Encodes a JavaScript string as UTF-8 without instrumentation.
 *
 * Isolated UTF-16 surrogates are replaced with U+FFFD, matching the standard
 * `TextEncoder` behavior defined by the WHATWG Encoding specification.
 */
function utf8EncodeRaw(s: string): Uint8Array {
  const bytes: number[] = [];

  for (const ch of s) {
    const codePoint = ch.codePointAt(0)!;

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      bytes.push(0xef, 0xbf, 0xbd);
    } else if (codePoint < 0x800) {
      bytes.push(
          0xc0 | (codePoint >> 6),
          0x80 | (codePoint & 0x3f)
      );
    } else if (codePoint < 0x10000) {
      bytes.push(
          0xe0 | (codePoint >> 12),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
          0xf0 | (codePoint >> 18),
          0x80 | ((codePoint >> 12) & 0x3f),
          0x80 | ((codePoint >> 6) & 0x3f),
          0x80 | (codePoint & 0x3f)
      );
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Encodes a JavaScript string as UTF-8.
 *
 * Development measurements log only character and byte counts. String
 * contents are never logged because callers may pass archive plaintext or a
 * passphrase.
 */
export function utf8Encode(s: string): Uint8Array {
  const measurement = measureDevelopmentSync(
      "archive.codec.utf8.encode",
      () => utf8EncodeRaw(s),
      {
        inputCharacters: s.length,
      }
  );

  if (debugLoggingAllows("debug")) {
    console.log("[performance] archive.codec.utf8.encode result", {
      outputBytes: measurement.value.length,
    });
  }

  return measurement.value;
}

/**
 * Strictly decodes UTF-8 bytes without instrumentation.
 *
 * Returns `null` for malformed sequences, overlong encodings, surrogate code
 * points, truncated sequences, or code points beyond the Unicode range.
 */
function utf8DecodeStrictRaw(bytes: Uint8Array): string | null {
  let result = "";
  let i = 0;

  while (i < bytes.length) {
    const b0 = bytes[i];
    let codePoint: number;
    let extraBytes: number;

    if (b0 < 0x80) {
      codePoint = b0;
      extraBytes = 0;
    } else if ((b0 & 0xe0) === 0xc0) {
      if (b0 < 0xc2) {
        return null;
      }

      codePoint = b0 & 0x1f;
      extraBytes = 1;
    } else if ((b0 & 0xf0) === 0xe0) {
      codePoint = b0 & 0x0f;
      extraBytes = 2;
    } else if ((b0 & 0xf8) === 0xf0) {
      if (b0 > 0xf4) {
        return null;
      }

      codePoint = b0 & 0x07;
      extraBytes = 3;
    } else {
      return null;
    }

    if (i + extraBytes >= bytes.length) {
      return null;
    }

    for (let j = 1; j <= extraBytes; j++) {
      const b = bytes[i + j];

      if ((b & 0xc0) !== 0x80) {
        return null;
      }

      codePoint = (codePoint << 6) | (b & 0x3f);
    }

    if (
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
        (extraBytes === 2 && codePoint < 0x800) ||
        (extraBytes === 3 && codePoint < 0x10000)
    ) {
      return null;
    }

    result += String.fromCodePoint(codePoint);
    i += extraBytes + 1;
  }

  return result;
}

/**
 * Strictly decodes UTF-8 bytes into a JavaScript string.
 *
 * Development measurements log only byte count and success state. Decoded
 * text is never logged because it may contain sensitive archive content.
 */
export function utf8DecodeStrict(bytes: Uint8Array): string | null {
  const measurement = measureDevelopmentSync(
      "archive.codec.utf8.decode",
      () => utf8DecodeStrictRaw(bytes),
      {
        inputBytes: bytes.length,
      }
  );

  if (debugLoggingAllows("debug")) {
    console.log("[performance] archive.codec.utf8.decode result", {
      success: measurement.value !== null,
      outputCharacters: measurement.value?.length ?? 0,
    });
  }

  return measurement.value;
}