import { v4 as uuidv4 } from "uuid";
import { Archive, DistortionData, Thought } from ".";

export const A = Archive.createParsers(DistortionData);

const fixture: Thought.Json = {
  uuid: uuidv4(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: ["all-or-nothing"],
  challenge: "chal",
  alternativeThought: "alt",
  v: "nonsense-version",
};

test("parse empty json snapshot from old version", () => {
  // copied from expo47/archive.test.ts
  const snapshot =
    ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2gLoC+QA:FreeCBT:";
  expect(A.fromString.decode(snapshot)).toEqual(Archive.create([]));
});
test("parse nonempty json snapshot from old version", () => {
  // copied from expo47/archive.test.ts
  const snapshot =
    ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2qAIblGkC2zRKCAKmSo0oIVuwIhkzADbT0AO0roRU6RJlF0cedzToBFakREaJCUpXkoeGACIpa7OD1Lz6kBqNmZScTPNISFEUQAF1CBDh0bnQAExhjaBwATgB2AAZMdJwsnD509MgCopwAOgAmAGYAFgAtCXIAB1iY+MSQFIzc3PzC4uyKmvrCcnIUWJFaTnRR8YkIaAMhImw8AF9QtaA===:FreeCBT:";
  const arc = A.fromString.decode(snapshot);
  expect(arc.thoughts).toHaveLength(1);
  const [t] = arc.thoughts;
  expect(t.automaticThought).toBe("auto");
  expect(t.challenge).toBe("chal");
  expect(t.alternativeThought).toBe("alt");
  expect(Array.from(t.cognitiveDistortions).map((d) => d.slug)).toEqual([
    "all-or-nothing",
  ]);
  expect(t.createdAt).toEqual(new Date(1234));
  expect(t.updatedAt).toEqual(new Date(1234));
  expect(t.uuid).toBe("someuuid");
});
test("parse multiple json snapshot from old version", () => {
  // copied from expo47/archive.test.ts
  const snapshot =
    ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2qAIblGkC2zRKCAKmSo0oIVuwIhkzADbT0AO0roRU6RJlF0cedzToBFakREaJCUpXkoeGACIpa7OD1Lz6kBqNmZScTPNISFEUQAF1CBDh0bnQAExhjaBwATgB2AAZMdJwsnD509MgCopwAOgAmAGYAFgAtCXIAB1iY+MSQFIzc3PzC4uyKmvrCcnIUWJFaTnRR8YkIaAMhImw8AF98FjZOXX5BIxNt8rMkGTlFZWhVY8INLR0bfX3haA0byQsrR/tHXxc3RheaQ+PwBIIhQi0QTSWKYRwxDgKOhhCJRVoJESdTLZHr9PrVUqVco4YYgJotTRtTFpbE5bK9Ir4wnE0mzCbQKaItnvBYgJZGVYgNahNZAA:FreeCBT:";
  const arc = A.fromString.decode(snapshot);
  expect(arc.thoughts).toHaveLength(2);
  const [first, second] = arc.thoughts;
  expect(first.automaticThought).toBe("auto");
  expect(first.challenge).toBe("chal");
  expect(first.alternativeThought).toBe("alt");
  expect(Array.from(first.cognitiveDistortions).map((d) => d.slug)).toEqual([
    "all-or-nothing",
  ]);
  expect(first.createdAt).toEqual(new Date(1234));
  expect(first.uuid).toBe("someuuid");

  expect(second.automaticThought).toBe("auto2");
  expect(second.challenge).toBe("chal2");
  expect(second.alternativeThought).toBe("alt2");
  expect(
    Array.from(second.cognitiveDistortions)
      .map((d) => d.slug)
      .sort()
  ).toEqual(["all-or-nothing", "should-statements"]);
  expect(second.createdAt).toEqual(new Date(4321));
  expect(second.uuid).toBe("someuuid2");
});

test("create and parse", () => {
  const json: Archive.Json = { v: "Archive-v1", thoughts: [fixture] };
  const arc: Archive.Archive = A.fromJson.decode(json);
  expect(arc.thoughts).toHaveLength(1);
  const enc: string = A.fromString.encode(arc);
  expect(A.fromString.decode(enc)).toEqual(arc);
});

test("enforce valid distortions", () => {
  const json: Archive.Json = {
    v: "Archive-v1",
    thoughts: [{ ...fixture, cognitiveDistortions: ["nonsense"] }],
  };
  expect(() => A.fromJson.decode(json)).toThrow("no such Distortion.Slug");
});

test("round-trips explicit thought fixtures through encode/decode", () => {
  const json: Archive.Json = {
    v: "Archive-v1",
    thoughts: [
      {
        ...fixture,
        automaticThought: "auto",
        challenge: "chal",
        alternativeThought: "alt",
        cognitiveDistortions: ["all-or-nothing"],
        createdAt: new Date(1234).toISOString(),
        updatedAt: new Date(1234).toISOString(),
        uuid: "someuuid",
      },
      {
        ...fixture,
        automaticThought: "auto2",
        challenge: "chal2",
        alternativeThought: "alt2",
        cognitiveDistortions: ["all-or-nothing", "should-statements"],
        createdAt: new Date(4321).toISOString(),
        updatedAt: new Date(4321).toISOString(),
        uuid: "someuuid2",
      },
    ],
  };
  const arc = A.fromJson.decode(json);
  const enc = A.fromString.encode(arc);
  expect(enc).toMatch(/^:FreeCBT:/);
  expect(A.fromString.decode(enc)).toEqual(arc);
});
