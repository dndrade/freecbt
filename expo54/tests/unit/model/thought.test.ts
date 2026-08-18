import { DistortionData, Thought } from "@/src/model";

export const T = Thought.createParsers(DistortionData);

const fixture: Thought.Json = {
  uuid: crypto.randomUUID(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: ["all-or-nothing"],
  challenge: "chal",
  alternativeThought: "alt",
  v: Thought.VERSION,
};

test("parse valid json", () => {
  const t = T.fromJson.decode(fixture);
  expect(t).toBeTruthy();
  expect(t.uuid.startsWith(Thought.KEY_PREFIX)).toBe(false);
  expect(t.cognitiveDistortions.size).toBe(1);
  expect(Array.from(t.cognitiveDistortions).map((d) => d.slug)).toEqual([
    "all-or-nothing",
  ]);
});

test("allow missing version", () => {
  const { v, ...json } = fixture;
  const t = T.fromJson.decode(json);
  expect(t).toBeTruthy();
});

test("allow legacy distortion objects", () => {
  const json = {
    ...fixture,
    cognitiveDistortions: [{ slug: "all-or-nothing", stuff: "nonsense" }],
  };
  const t = T.fromJson.decode(json);
  expect(t).toBeTruthy();
});

test("accept keys saved in the id field, too", () => {
  // I messed this one up for a few versions...!
  // be forgiving when parsing it...
  const json = { ...fixture, uuid: `${Thought.KEY_PREFIX}${fixture.uuid}` };
  const t = T.fromJson.decode(json);
  // ...but consistent after it's parsed
  expect(t).toBeTruthy();
  expect(t.uuid).toBe(fixture.uuid);
  expect(t.uuid.startsWith(Thought.KEY_PREFIX)).toBe(false);
  // re-deriving the storage key from the recovered id must reproduce the
  // exact same key this record was already stored under — no duplicate key.
  expect(Thought.key(t)).toBe(json.uuid);
});

test("enforce missing distortions", () => {
  expect(() =>
    T.fromJson.decode({ ...fixture, cognitiveDistortions: ["nonsense"] })
  ).toThrow("no such Distortion.Slug");
});

test("filter out legacy distortions marked selected: false", () => {
  const json = {
    ...fixture,
    cognitiveDistortions: [
      { slug: "all-or-nothing", selected: true },
      { slug: "mind-reading", selected: false },
      { slug: "should-statements" },
    ],
  };
  const t = T.fromJson.decode(json);
  expect(
    Array.from(t.cognitiveDistortions)
      .map((d) => d.slug)
      .sort()
  ).toEqual(["all-or-nothing", "should-statements"]);
});

test("filter out all legacy distortions leaves an empty set", () => {
  const json = {
    ...fixture,
    cognitiveDistortions: [
      { slug: "all-or-nothing", selected: false },
      { slug: "mind-reading", selected: false },
    ],
  };
  const t = T.fromJson.decode(json);
  expect(Array.from(t.cognitiveDistortions).map((d) => d.slug)).toEqual([]);
});

test("decode(encode(t)) round-trips", () => {
  const t = T.fromJson.decode(fixture);
  expect(T.fromJson.decode(T.fromJson.encode(t))).toEqual(t);
});

test("reject a malformed createdAt", () => {
  expect(() =>
    T.fromJson.decode({ ...fixture, createdAt: "not a date" })
  ).toThrow();
  expect(() =>
    T.fromJson.decode({ ...fixture, createdAt: 12345 as any })
  ).toThrow();
});

test("allow legacy distortion objects with or without a v field", () => {
  const legacyDistortions = [
    { slug: "all-or-nothing", selected: true },
    { slug: "should-statements" },
  ];
  const expectedSlugs = ["all-or-nothing", "should-statements"];

  const withV = { ...fixture, cognitiveDistortions: legacyDistortions };
  expect(
    Array.from(T.fromJson.decode(withV).cognitiveDistortions)
      .map((d) => d.slug)
      .sort()
  ).toEqual(expectedSlugs);

  const { v, ...fixtureWithoutV } = fixture;
  const withoutV = {
    ...fixtureWithoutV,
    cognitiveDistortions: legacyDistortions,
  };
  expect(
    Array.from(T.fromJson.decode(withoutV).cognitiveDistortions)
      .map((d) => d.slug)
      .sort()
  ).toEqual(expectedSlugs);
});

test("encode", () => {
  const t = T.fromJson.decode(fixture);
  const json = T.fromJson.encode(t);
  expect(json).toEqual(fixture);
});

test("creates a thought without the runtime global crypto API", () => {
  const originalRandomUUID = globalThis.crypto.randomUUID;

  globalThis.crypto.randomUUID = () => {
    throw new Error("global crypto.randomUUID must not be used");
  };

  try {
    const now = new Date("2026-08-11T00:00:00.000Z");
    const thought = Thought.create(Thought.emptySpec(), now);

    expect(thought.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(thought.createdAt).toBe(now);
    expect(thought.updatedAt).toBe(now);
  } finally {
    globalThis.crypto.randomUUID = originalRandomUUID;
  }
});
