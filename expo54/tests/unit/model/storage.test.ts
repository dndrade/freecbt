import { Storage } from "@/src";
import { Archive, DistortionData, Thought } from "@/src/model";
import type { ThoughtSaveOutboxRecord } from "@/src/model/thought-save";
import { z } from "zod";
import { createFakeAsyncStorage as fakeAsyncStorage } from "@/tests/support/async-storage";

test("readAll: a malformed thought does not delete either record", async () => {
  const validUuid = "11111111-1111-1111-1111-111111111111";
  const validKey = `${Thought.KEY_PREFIX}${validUuid}`;
  const malformedKey = `${Thought.KEY_PREFIX}22222222-2222-2222-2222-222222222222`;
  const validThoughtJson = {
    v: "Thought-v1",
    automaticThought: "auto",
    alternativeThought: "alt",
    cognitiveDistortions: ["all-or-nothing"],
    challenge: "chal",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    uuid: validUuid,
  };
  const async = fakeAsyncStorage({
    [validKey]: JSON.stringify(validThoughtJson),
    [malformedKey]: "not valid json {",
  });
  const T = Storage.thoughts(DistortionData, async);

  const result = await T.readAll();

  expect(result.thoughts.size).toBe(1);
  expect(result.thoughtParseErrors.size).toBe(1);
  expect(result.thoughts.has(validKey as Thought.Key)).toBe(true);
  expect(result.thoughtParseErrors.has(malformedKey as Thought.Key)).toBe(true);
  expect(
    result.thoughtParseErrors.get(malformedKey as Thought.Key),
  ).toBeInstanceOf(z.ZodError);
  expect(await async.getItem(validKey)).not.toBe(null);
  expect(await async.getItem(malformedKey)).not.toBe(null);
});

describe("thoughts: persistSubmittedThought", () => {
  function sampleThought(
    overrides: Partial<Thought.Spec> = {},
    now = new Date(0),
  ): Thought.Thought {
    return Thought.create(
      { ...Thought.emptySpec(), automaticThought: "original", ...overrides },
      now,
    );
  }

  test("first write persists the submitted thought at its stable key", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const thought = sampleThought();

    await T.persistSubmittedThought(thought.uuid, thought);

    expect(await T.readKeys()).toEqual([Thought.key(thought)]);
    expect(await T.read(Thought.key(thought))).toEqual(thought);
  });

  test("exact replay of the same submission id and content is an idempotent no-op", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const thought = sampleThought();

    await T.persistSubmittedThought(thought.uuid, thought);
    await expect(
      T.persistSubmittedThought(thought.uuid, thought),
    ).resolves.toBeUndefined();

    expect(await T.readKeys()).toEqual([Thought.key(thought)]);
    expect(await T.read(Thought.key(thought))).toEqual(thought);
  });

  test("an existing record with matching content is treated as already persisted", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const thought = sampleThought();
    // written directly, bypassing persistSubmittedThought, to simulate an interrupted
    // replay where the record already landed before the crash/restart
    await T.write(thought);

    await expect(
      T.persistSubmittedThought(thought.uuid, thought),
    ).resolves.toBeUndefined();

    expect(await T.readKeys()).toEqual([Thought.key(thought)]);
    expect(await T.read(Thought.key(thought))).toEqual(thought);
  });

  test("a conflicting record at the same key is an explicit failure, never overwritten", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const original = sampleThought({ automaticThought: "original content" });
    await T.write(original);
    const conflicting: Thought.Thought = {
      ...original,
      automaticThought: "different content",
    };

    await expect(
      T.persistSubmittedThought(conflicting.uuid, conflicting),
    ).rejects.toThrow();

    expect(await T.readKeys()).toEqual([Thought.key(original)]);
    expect(await T.read(Thought.key(original))).toEqual(original);
  });

  test("submissionId must match thought.uuid", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const thought = sampleThought();
    const otherId = Thought.Id.decode("11111111-1111-1111-1111-111111111111");

    await expect(T.persistSubmittedThought(otherId, thought)).rejects.toThrow();

    expect(await T.readKeys()).toEqual([]);
  });

  test("cleanup-failed replay: retried outbox removal does not duplicate or rewrite the persisted thought", async () => {
    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    const outbox = Storage.thoughtSaveOutbox(DistortionData, async);
    const thought = sampleThought({
      automaticThought: "cleanup-failed thought",
    });
    const submissionId = thought.uuid;

    const active: ThoughtSaveOutboxRecord = {
      submissionId,
      thought,
      sourceDraftRevision: 0,
      attemptCount: 1,
      lastAttemptAt: new Date(0),
      lastError: null,
      retryRequested: false,
      thoughtPersisted: false,
      updatedAt: new Date(0),
      status: "active",
    };
    await outbox.insert(active);

    // the "write-submitted-thought" cmd handler succeeds: the thought is durably saved
    await T.persistSubmittedThought(submissionId, thought);

    // outbox removal then fails, leaving a cleanup-failed record (thoughtPersisted stays true)
    const cleanupFailed: ThoughtSaveOutboxRecord = {
      ...active,
      status: "cleanup-failed",
      thoughtPersisted: true,
      attemptCount: 2,
    };
    await outbox.update(cleanupFailed);

    // an explicit retry reconciles against the same key: replaying persistSubmittedThought
    // with the original immutable snapshot must stay a no-op, never a duplicate or a new uuid
    await expect(
      T.persistSubmittedThought(submissionId, thought),
    ).resolves.toBeUndefined();
    expect(await T.readKeys()).toEqual([Thought.key(thought)]);
    expect(await T.read(Thought.key(thought))).toEqual(thought);

    // and outbox removal, retried on its own, can now complete cleanup
    await outbox.remove(submissionId);
    expect(await outbox.readAll()).toEqual([]);
  });
});

test("readAll: restores every thought from a decoded historical archive", async () => {
  // Same real historical-format snapshot already used in
  // model/archive/thoughts-archive.test.ts's "parse nonempty json snapshot from old version".
  const snapshot =
    ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2qAIblGkC2zRKCAKmSo0oIVuwIhkzADbT0AO0roRU6RJlF0cedzToBFakREaJCUpXkoeGACIpa7OD1Lz6kBqNmZScTPNISFEUQAF1CBDh0bnQAExhjaBwATgB2AAZMdJwsnD509MgCopwAOgAmAGYAFgAtCXIAB1iY+MSQFIzc3PzC4uyKmvrCcnIUWJFaTnRR8YkIaAMhImw8AF9QtaA===:FreeCBT:";
  const A = Archive.createParsers(DistortionData);
  const arc = A.fromString.decode(snapshot);
  expect(arc.thoughts).toHaveLength(1);

  const async = fakeAsyncStorage();
  const T = Storage.thoughts(DistortionData, async);
  for (const t of arc.thoughts) {
    await T.write(t);
  }

  const result = await T.readAll();
  expect(result.thoughts.size).toBe(arc.thoughts.length);
  expect(result.thoughtParseErrors.size).toBe(0);
  const [restored] = Array.from(result.thoughts.values());
  expect(restored.automaticThought).toBe("auto");
  expect(restored.challenge).toBe("chal");
  expect(restored.alternativeThought).toBe("alt");
  expect(restored.uuid).toBe("someuuid");
});
