const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP = new Map<string, number>(
  Array.from(BASE64_CHARS).map((c, i) => [c, i])
);

export function encodeBase64(bytes: Uint8Array): string {
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

export function decodeBase64Strict(s: string): Uint8Array | null {
  if (s.length === 0) return new Uint8Array(0);
  if (s.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;
  const paddingLen = (s.match(/=*$/) ?? [""])[0].length;
  const core = s.slice(0, s.length - paddingLen);
  if (core.includes("=")) return null; // '=' only allowed as trailing padding
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
    if (outIdx < bytesLen) out[outIdx++] = (triplet >> 16) & 0xff;
    if (outIdx < bytesLen) out[outIdx++] = (triplet >> 8) & 0xff;
    if (outIdx < bytesLen) out[outIdx++] = triplet & 0xff;
  }
  return out;
}

export function isCanonicalBase64(s: string): boolean {
  const decoded = decodeBase64Strict(s);
  return decoded !== null && encodeBase64(decoded) === s;
}

export function utf8Encode(s: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of s) {
    const codePoint = ch.codePointAt(0)!;
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
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

export function utf8DecodeStrict(bytes: Uint8Array): string | null {
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
      if (b0 < 0xc2) return null; // overlong encoding
      codePoint = b0 & 0x1f;
      extraBytes = 1;
    } else if ((b0 & 0xf0) === 0xe0) {
      codePoint = b0 & 0x0f;
      extraBytes = 2;
    } else if ((b0 & 0xf8) === 0xf0) {
      if (b0 > 0xf4) return null; // beyond valid Unicode range
      codePoint = b0 & 0x07;
      extraBytes = 3;
    } else {
      return null;
    }
    if (i + extraBytes >= bytes.length) return null;
    for (let j = 1; j <= extraBytes; j++) {
      const b = bytes[i + j];
      if ((b & 0xc0) !== 0x80) return null;
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
