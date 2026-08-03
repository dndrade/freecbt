import {
  decodeBase64Strict,
  encodeBase64,
  isCanonicalBase64,
  utf8DecodeStrict,
  utf8Encode,
} from "./archive-codec";

describe("base64", () => {
  test("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 127, 63]);
    const encoded = encodeBase64(bytes);
    expect(decodeBase64Strict(encoded)).toEqual(bytes);
  });
  test("round-trips empty input", () => {
    expect(encodeBase64(new Uint8Array(0))).toBe("");
    expect(decodeBase64Strict("")).toEqual(new Uint8Array(0));
  });
  test("matches a known vector", () => {
    // "hello" in UTF-8
    const bytes = new Uint8Array([104, 101, 108, 108, 111]);
    expect(encodeBase64(bytes)).toBe("aGVsbG8=");
    expect(decodeBase64Strict("aGVsbG8=")).toEqual(bytes);
  });
  test("rejects non-canonical padding", () => {
    expect(decodeBase64Strict("aGVsbG8")).toBeNull(); // missing padding
  });
  test("rejects URL-safe alphabet", () => {
    expect(decodeBase64Strict("-_==")).toBeNull();
  });
  test("rejects embedded whitespace", () => {
    expect(decodeBase64Strict("aGVs\nbG8=")).toBeNull();
  });
  test("rejects wrong length", () => {
    expect(decodeBase64Strict("abc")).toBeNull();
  });
  test("isCanonicalBase64 rejects a non-canonical re-encoding", () => {
    // valid base64 alphabet/padding, but decodes to bytes whose canonical
    // encoding wouldn't be this exact string (extra info in padding bits)
    expect(isCanonicalBase64("aGVsbG9=")).toBe(false);
  });
  test("isCanonicalBase64 accepts a canonical string", () => {
    expect(isCanonicalBase64("aGVsbG8=")).toBe(true);
  });
});

describe("utf8", () => {
  test("round-trips ASCII", () => {
    const s = "hello world";
    expect(utf8DecodeStrict(utf8Encode(s))).toBe(s);
  });
  test("round-trips multi-byte and surrogate-pair characters", () => {
    const s = "café 🎉 日本語";
    expect(utf8DecodeStrict(utf8Encode(s))).toBe(s);
  });
  test("rejects invalid continuation bytes", () => {
    expect(utf8DecodeStrict(new Uint8Array([0xc2, 0x00]))).toBeNull();
  });
  test("rejects truncated multi-byte sequence", () => {
    expect(utf8DecodeStrict(new Uint8Array([0xe2, 0x82]))).toBeNull();
  });
  test("rejects overlong encoding", () => {
    expect(utf8DecodeStrict(new Uint8Array([0xc0, 0x80]))).toBeNull();
  });
  test("rejects encoded surrogate halves", () => {
    expect(utf8DecodeStrict(new Uint8Array([0xed, 0xa0, 0x80]))).toBeNull();
  });
});
