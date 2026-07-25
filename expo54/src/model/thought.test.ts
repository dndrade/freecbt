import { v4 as uuidv4 } from "uuid";
import { DistortionData, Thought } from ".";

export const T = Thought.createParsers(DistortionData);

const fixture: Thought.Json = {
  uuid: uuidv4(),
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
