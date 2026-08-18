import { Storage } from "@/src";
import { DistortionData, Thought } from "@/src/model";
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

function fakeAsyncStorageWithBlockedFirstSet(
  initial: Record<string, string> = {}
) {
  const release = (() => {
    let resolve!: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  })();
  const store = new Map(Object.entries(initial));
  let setCalls = 0;
  return {
    storage: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        setCalls += 1;
        if (setCalls === 1) await release.promise;
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
    } as unknown as AsyncStorageStatic,
    release,
  };
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

  test("keeps a clear-failed cleanup marker written over an existing draft", async () => {
    const async = fakeAsyncStorage();
    const drafts = (Storage as any).homeThoughtDraft(DistortionData, async);
    const draft = {
      spec: sampleSpec(),
      sourceRevision: 8,
      updatedAt: new Date("2026-08-11T00:08:00.000Z"),
      draftCleanup: null,
    };

    await drafts.write(draft);
    const marked = {
      ...draft,
      draftCleanup: {
        status: "clear-failed" as const,
        sourceRevision: 8,
        outboxSubmissionId: "33333333-3333-3333-3333-333333333333",
        lastError: "disk full",
        updatedAt: new Date("2026-08-11T00:09:00.000Z"),
      },
    };
    await drafts.write(marked);

    await expect(drafts.read()).resolves.toEqual(marked);
  });

  test("keeps the newest queued draft write after an older write has already started", async () => {
    const blocked = fakeAsyncStorageWithBlockedFirstSet();
    const drafts = (Storage as any).homeThoughtDraft(
      DistortionData,
      blocked.storage
    );
    const older = {
      spec: sampleSpec(),
      sourceRevision: 3,
      updatedAt: new Date("2026-08-11T00:03:00.000Z"),
      draftCleanup: null,
    };
    const newer = {
      ...older,
      sourceRevision: 4,
      updatedAt: new Date("2026-08-11T00:04:00.000Z"),
      spec: {
        ...older.spec,
        alternativeThought: "newest wins",
      },
    };

    const first = drafts.write(older);
    const second = drafts.write(newer);
    blocked.release.resolve();

    await Promise.all([first, second]);

    await expect(drafts.read()).resolves.toEqual(newer);
  });

  test("does not persist mutation of a draft record after write begins but before persistence settles", async () => {
    const blocked = fakeAsyncStorageWithBlockedFirstSet();
    const drafts = (Storage as any).homeThoughtDraft(
      DistortionData,
      blocked.storage
    );
    const draft = {
      spec: sampleSpec(),
      sourceRevision: 5,
      updatedAt: new Date("2026-08-11T00:05:00.000Z"),
      draftCleanup: null,
    };

    const write = drafts.write(draft);
    draft.spec.alternativeThought = "mutated after write";
    blocked.release.resolve();

    await write;
    await expect(drafts.read()).resolves.toEqual({
      spec: sampleSpec(),
      sourceRevision: 5,
      updatedAt: new Date("2026-08-11T00:05:00.000Z"),
      draftCleanup: null,
    });
  });
});
