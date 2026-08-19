import AsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { Archive, DistortionData, Model, Thought } from "@/src/model";
import { Storage } from "@/src";
import { resetAsyncStorage } from "@/tests/support/async-storage";

const A = Archive.createParsers(DistortionData);

function freshStorage() {
  // the official jest mock keeps a single module-level Map, so clear it
  // between tests instead of trusting isolation across files/tests
  resetAsyncStorage();
  return Storage.thoughts(DistortionData, AsyncStorage);
}

// exact historical "Thought-v1" shape from `04-thought-records.md`
// (`expo54/src/legacy/io-ts/thought/persist.ts` at tag `expo-v2.4.0`)
function historicalThoughtV1(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    v: "Thought-v1",
    automaticThought: "I always fail",
    alternativeThought: "I don't always fail",
    cognitiveDistortions: ["all-or-nothing"],
    challenge: "one bad day doesn't mean always",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    uuid: crypto.randomUUID(),
    ...overrides,
  };
}

// the older, undated "Legacy" per-thought shape also decoded by the
// historical build (object-shaped `cognitiveDistortions`), per
// `04-thought-records.md` / `Thought.LegacyJson`
function historicalThoughtLegacy(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    automaticThought: "nobody likes me",
    alternativeThought: "some people like me",
    cognitiveDistortions: [{ slug: "labeling" }, { slug: "mind-reading" }],
    challenge: "that's an overgeneralization",
    createdAt: new Date(2000).toISOString(),
    updatedAt: new Date(3000).toISOString(),
    uuid: crypto.randomUUID(),
    ...overrides,
  };
}

function wrapArchiveJson(value: unknown): string {
  // Build the archive envelope directly so the literal historical
  // `Archive-v1` version and per-thought shapes reach `decodeFile`
  // unchanged. Do not use A.fromJson/A.fromString.encode here because
  // the current encoder rewrites the archive as Archive-v2.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LZ = require("lz-string");

  return `:FreeCBT:${LZ.compressToBase64(JSON.stringify(value))}:FreeCBT:`;
}

async function captureRawThoughtStorage(
  storage: ReturnType<typeof freshStorage>
) {
  const keys = [...(await storage.readKeys())].sort();
  const raw = await AsyncStorage.multiGet(keys);

  return { keys, raw };
}

async function expectThoughtStorageUnchanged(
  storage: ReturnType<typeof freshStorage>,
  before: Awaited<ReturnType<typeof captureRawThoughtStorage>>
) {
  const after = await captureRawThoughtStorage(storage);

  expect(after.keys).toEqual(before.keys);
  expect(after.raw).toEqual(before.raw);
}

async function expectExistingThoughtPreserved(
  storage: ReturnType<typeof freshStorage>,
  before: Awaited<ReturnType<typeof captureRawThoughtStorage>>,
  existing: Thought.Thought
) {
  await expectThoughtStorageUnchanged(storage, before);

  const readBack = await storage.readAll();

  expect(readBack.thoughtParseErrors.size).toBe(0);
  expect(readBack.thoughts.size).toBe(1);
  expect(readBack.thoughts.get(Thought.key(existing))).toEqual(existing);
}

describe("backup gate: historical decode", () => {
  test("decodeFile accepts an exact historical Archive-v1 fixture containing both historical per-thought shapes", () => {
    const archiveV1 = {
      v: "Archive-v1" as const,
      thoughts: [historicalThoughtV1(), historicalThoughtLegacy()],
    };

    const encoded = wrapArchiveJson(archiveV1);
    const result = A.decodeFile(encoded);

    expect(result.kind).toBe("legacy");

    if (result.kind === "legacy") {
      expect(result.archive.thoughts).toHaveLength(2);

      expect(
        result.archive.thoughts
          .map((thought) => thought.automaticThought)
          .sort()
      ).toEqual(["I always fail", "nobody likes me"].sort());

      const thoughtV1 = result.archive.thoughts.find(
        (thought) => thought.automaticThought === "I always fail"
      );
      expect(thoughtV1).toBeDefined();
      expect(thoughtV1!.alternativeThought).toBe("I don't always fail");
      expect(thoughtV1!.challenge).toBe("one bad day doesn't mean always");
      expect(thoughtV1!.createdAt.toISOString()).toBe(
        new Date(0).toISOString()
      );
      expect(thoughtV1!.updatedAt.toISOString()).toBe(
        new Date(1000).toISOString()
      );
      expect(
        Array.from(thoughtV1!.cognitiveDistortions).map(
          (distortion) => distortion.slug
        )
      ).toEqual(["all-or-nothing"]);

      const legacyThought = result.archive.thoughts.find(
        (thought) => thought.automaticThought === "nobody likes me"
      );
      expect(legacyThought).toBeDefined();
      expect(legacyThought!.alternativeThought).toBe("some people like me");
      expect(legacyThought!.challenge).toBe(
        "that's an overgeneralization"
      );
      expect(legacyThought!.createdAt.toISOString()).toBe(
        new Date(2000).toISOString()
      );
      expect(legacyThought!.updatedAt.toISOString()).toBe(
        new Date(3000).toISOString()
      );
      expect(
        Array.from(legacyThought!.cognitiveDistortions)
          .map((distortion) => distortion.slug)
          .sort()
      ).toEqual(["labeling", "mind-reading"]);
    }
  });
});

describe("backup gate: encrypted export/import round trip", () => {
  test("Model.toArchive -> encodeEncrypted -> decodeFile -> decrypt -> storage write -> readAll reproduces the original thoughts", async () => {
    const source = freshStorage();

    const first = Thought.create(
      {
        automaticThought: "auto 1",
        alternativeThought: "alt 1",
        challenge: "chal 1",
        cognitiveDistortions: new Set([
          DistortionData.bySlug.get("all-or-nothing")!,
        ]),
      },
      new Date(0)
    );

    const second = Thought.create(
      {
        automaticThought: "auto 2",
        alternativeThought: "alt 2",
        challenge: "chal 2",
        cognitiveDistortions: new Set([
          DistortionData.bySlug.get("mind-reading")!,
          DistortionData.bySlug.get("labeling")!,
        ]),
      },
      new Date(1000)
    );

    await source.write(first);
    await source.write(second);

    const beforeExport = await source.readAll();

    expect(beforeExport.thoughtParseErrors.size).toBe(0);
    expect(beforeExport.thoughts.size).toBe(2);

    const model = {
      thoughts: beforeExport.thoughts,
    } as Model.Ready;

    const archive = Model.toArchive(model);
    const passphrase = "a correct twelve-plus code point passphrase";

    const exported = await A.encodeEncrypted(archive, passphrase);

    const decoded = A.decodeFile(exported);

    expect(decoded.kind).toBe("encrypted");
    if (decoded.kind !== "encrypted") return;

    const restoredArchive = await decoded.decrypt(passphrase);

    const destination = freshStorage();

    await Promise.all(
      restoredArchive.thoughts.map((thought) => destination.write(thought))
    );

    const readBack = await destination.readAll();

    expect(readBack.thoughtParseErrors.size).toBe(0);
    expect(readBack.thoughts.size).toBe(2);
    expect(readBack.thoughts).toEqual(beforeExport.thoughts);
  });
});

describe("backup gate: decode rejection preserves pre-existing storage", () => {
  test("a malformed root object is rejected and preserves existing stored thoughts byte-for-byte", async () => {
    const storage = freshStorage();

    const existing = Thought.create(
      {
        automaticThought: "existing known-good thought",
        alternativeThought: "existing alternative",
        challenge: "existing challenge",
        cognitiveDistortions: new Set(),
      },
      new Date(42)
    );

    await storage.write(existing);
    const before = await captureRawThoughtStorage(storage);

    const result = A.decodeFile(":FreeCBT:not-real-lz-string-content:FreeCBT:");

    expect(result.kind).toBe("invalid");
    await expectExistingThoughtPreserved(storage, before, existing);
  });

  test("an archive with one malformed embedded thought is rejected and preserves existing stored thoughts byte-for-byte", async () => {
    const storage = freshStorage();

    const existing = Thought.create(
      {
        automaticThought: "existing known-good thought",
        alternativeThought: "existing alternative",
        challenge: "existing challenge",
        cognitiveDistortions: new Set(),
      },
      new Date(42)
    );

    await storage.write(existing);
    const before = await captureRawThoughtStorage(storage);

    const good = historicalThoughtV1();
    const bad = historicalThoughtV1({
      cognitiveDistortions: ["not-a-real-slug"],
    });

    const mixed = {
      v: "Archive-v1" as const,
      thoughts: [good, bad],
    };

    const result = A.decodeFile(wrapArchiveJson(mixed));

    expect(result.kind).toBe("invalid");

    if (result.kind === "invalid") {
      expect(result.reason).toBe("legacy thought decode failed");
    }

    expect(result.kind).toBe("invalid");
    await expectExistingThoughtPreserved(storage, before, existing);
  });
});

describe("backup gate: real export/import round trip", () => {
  test("Model.toArchive -> encode -> decodeFile -> storage write -> readAll reproduces the original thoughts", async () => {
    const storage = freshStorage();
    const now = new Date(0);
    const t1 = Thought.create(
      {
        automaticThought: "auto 1",
        alternativeThought: "alt 1",
        challenge: "chal 1",
        cognitiveDistortions: new Set(),
      },
      now
    );
    const t2 = Thought.create(
      {
        automaticThought: "auto 2",
        alternativeThought: "alt 2",
        challenge: "chal 2",
        cognitiveDistortions: new Set(),
      },
      new Date(1000)
    );
    await storage.write(t1);
    await storage.write(t2);

    const beforeExport = await storage.readAll();
    expect(beforeExport.thoughts.size).toBe(2);

    const model: Pick<Model.Ready, "thoughts"> = {
      thoughts: beforeExport.thoughts,
    };
    const archive = Model.toArchive(model as Model.Ready);
    const exported = A.fromString.encode(archive);

    // simulate a full restore into empty storage, as the backup screen's
    // "import" flow does via the `import-archive` action
    await storage.clear();
    expect((await storage.readAll()).thoughts.size).toBe(0);

    const decoded = A.decodeFile(exported);
    expect(decoded.kind).toBe("legacy");
    if (decoded.kind !== "legacy") return;

    await Promise.all(decoded.archive.thoughts.map((t) => storage.write(t)));
    const afterImport = await storage.readAll();

    expect(afterImport.thoughtParseErrors.size).toBe(0);
    expect(afterImport.thoughts.size).toBe(2);
    const restoredTexts = Array.from(afterImport.thoughts.values())
      .map((t: Thought.Thought) => t.automaticThought)
      .sort();
    expect(restoredTexts).toEqual(["auto 1", "auto 2"]);
  });
});
