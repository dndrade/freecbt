import { Storage } from "../..";
import { DistortionData, Thought } from "../../model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";

function fakeAsyncStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    multiGet: async (ks: readonly string[]) =>
      ks.map((k) => [k, store.get(k) ?? null] as const),
    multiSet: async (pairs: readonly [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
    multiRemove: async (ks: readonly string[]) => {
      for (const k of ks) store.delete(k);
    },
    getAllKeys: async () => Array.from(store.keys()),
  } as unknown as AsyncStorageStatic;
}

function sampleSpec(): Thought.Spec {
  return {
    automaticThought: "I always fail",
    cognitiveDistortions: new Set([DistortionData.list[0]]),
    challenge: "That is not always true",
    alternativeThought: "I can improve",
  };
}

describe("homeThoughtDraft", () => {
  test("round-trips meaningful draft data and persisted cleanup metadata in one isolated record", async () => {
    const async = fakeAsyncStorage();
    const drafts = (Storage as any).homeThoughtDraft(DistortionData, async);
    const draft = {
      spec: sampleSpec(),
      sourceRevision: 7,
      updatedAt: new Date("2026-08-11T00:00:00.000Z"),
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: 6,
        outboxSubmissionId: "11111111-1111-1111-1111-111111111111",
        lastError: "disk full",
        updatedAt: new Date("2026-08-11T00:01:00.000Z"),
      },
    };

    await drafts.write(draft);

    await expect(drafts.read()).resolves.toEqual(draft);
    const keys = await async.getAllKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith(Thought.KEY_PREFIX)).toBe(false);
  });

  test("omits an empty draft instead of persisting it", async () => {
    const async = fakeAsyncStorage();
    const drafts = (Storage as any).homeThoughtDraft(DistortionData, async);

    await drafts.write({
      spec: Thought.emptySpec(),
      sourceRevision: 1,
      updatedAt: new Date("2026-08-11T00:00:00.000Z"),
      draftCleanup: null,
    });

    await expect(drafts.read()).resolves.toBeNull();
    await expect(async.getAllKeys()).resolves.toEqual([]);
  });

  test("clears the persisted draft record", async () => {
    const async = fakeAsyncStorage();
    const drafts = (Storage as any).homeThoughtDraft(DistortionData, async);

    await drafts.write({
      spec: sampleSpec(),
      sourceRevision: 2,
      updatedAt: new Date("2026-08-11T00:00:00.000Z"),
      draftCleanup: {
        status: "none",
        sourceRevision: 2,
        outboxSubmissionId: "22222222-2222-2222-2222-222222222222",
        lastError: null,
        updatedAt: new Date("2026-08-11T00:02:00.000Z"),
      },
    });

    await drafts.clear();

    await expect(drafts.read()).resolves.toBeNull();
    await expect(async.getAllKeys()).resolves.toEqual([]);
  });
});
