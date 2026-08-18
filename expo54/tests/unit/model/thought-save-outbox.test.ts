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

function fakeAsyncStorageWithBlockedSet(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const gates: Array<Promise<void>> = [];
  return {
    storage: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        const gate = gates.shift();
        if (gate) await gate;
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
    blockNextSet() {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      gates.push(promise);
      return { resolve };
    },
  };
}

function makeThought(i: number): Thought.Thought {
  const createdAt = new Date(Date.UTC(2026, 7, 11, 0, 0, i));
  const updatedAt = new Date(Date.UTC(2026, 7, 11, 0, 10, i));
  return Thought.Thought.parse({
    automaticThought: `automatic-${i}`,
    cognitiveDistortions: new Set([DistortionData.list[i % DistortionData.list.length]]),
    challenge: `challenge-${i}`,
    alternativeThought: `alternative-${i}`,
    createdAt,
    updatedAt,
    uuid: `${String(i).padStart(8, "0")}-1111-4111-8111-${String(i)
      .padStart(12, "0")}`,
  });
}

function makeRecord(
  i: number,
  status:
    | "insertion-pending"
    | "pending"
    | "uncertain"
    | "active"
    | "failed"
    | "cleanup-failed"
) {
  const thought = makeThought(i);
  const lastAttemptAt = new Date(Date.UTC(2026, 7, 11, 0, 20, i));
  const updatedAt = new Date(Date.UTC(2026, 7, 11, 0, 30, i));
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: i,
    attemptCount: i + 1,
    lastAttemptAt,
    lastError: status === "failed" ? `failed-${i}` : null,
    retryRequested: status === "failed",
    thoughtPersisted: status === "cleanup-failed",
    updatedAt,
    status,
  };
}

describe("thoughtSaveOutbox", () => {
  test("round-trips ordered outbox records across every status in a separate namespace", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const records = [
      makeRecord(1, "insertion-pending"),
      makeRecord(2, "pending"),
      makeRecord(3, "uncertain"),
      makeRecord(4, "active"),
      makeRecord(5, "failed"),
      makeRecord(6, "cleanup-failed"),
    ];

    for (const record of records) {
      await outbox.insert(record);
    }

    await expect(outbox.readAll()).resolves.toEqual(records);
    const keys = await async.getAllKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith(Thought.KEY_PREFIX)).toBe(false);
  });

  test("updates records in place and removes them by stable submission id", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const first = makeRecord(7, "pending");
    const second = makeRecord(8, "failed");

    await outbox.insert(first);
    await outbox.insert(second);

    const updatedSecond = {
      ...second,
      attemptCount: 9,
      retryRequested: false,
      lastError: null,
      status: "pending",
    };
    await outbox.update(updatedSecond);
    await outbox.remove(first.submissionId);

    await expect(outbox.readAll()).resolves.toEqual([updatedSecond]);
  });

  test("serializes insert then update when the initial insert persistence is still in flight", async () => {
    const blocked = fakeAsyncStorageWithBlockedSet();
    const outbox = (Storage as any).thoughtSaveOutbox(
      DistortionData,
      blocked.storage
    );
    const gate = blocked.blockNextSet();
    const first = makeRecord(9, "pending");
    const updated = {
      ...first,
      attemptCount: 2,
      lastError: "retry me",
      retryRequested: true,
      status: "failed" as const,
      updatedAt: new Date("2026-08-11T00:40:00.000Z"),
    };

    const insert = outbox.insert(first);
    const update = outbox.update(updated);
    gate.resolve();

    await Promise.all([insert, update]);
    await expect(outbox.readAll()).resolves.toEqual([updated]);
  });

  test("rejects an insert whose submission id does not match thought.uuid", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const record = makeRecord(20, "pending");

    await expect(
      outbox.insert({
        ...record,
        submissionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      })
    ).rejects.toThrow("submission identity");
  });

  test("rejects duplicate submission ids", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const record = makeRecord(21, "pending");

    await outbox.insert(record);

    await expect(outbox.insert(record)).rejects.toThrow("duplicate submission");
  });

  test("rejects a stale queued update after a queued removal wins first", async () => {
    const blocked = fakeAsyncStorageWithBlockedSet();
    const outbox = (Storage as any).thoughtSaveOutbox(
      DistortionData,
      blocked.storage
    );
    const record = makeRecord(25, "pending");
    await outbox.insert(record);

    const gate = blocked.blockNextSet();
    const removal = outbox.remove(record.submissionId);
    const staleUpdate = outbox.update({
      ...record,
      status: "failed",
      lastError: "too late",
      retryRequested: true,
    });
    gate.resolve();

    await removal;
    await expect(staleUpdate).rejects.toThrow("missing outbox record");
    await expect(outbox.readAll()).resolves.toEqual([]);
  });

  test("does not persist external mutation of inserted or read records on a later unrelated write", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const first = makeRecord(26, "pending");
    const second = makeRecord(27, "pending");

    await outbox.insert(first);
    first.status = "failed";
    first.lastError = "mutated outside the writer";

    const [readBack] = await outbox.readAll();
    (readBack as any).retryRequested = true;
    (readBack as any).lastError = "mutated after read";

    await outbox.insert(second);

    await expect(outbox.readAll()).resolves.toEqual([
      makeRecord(26, "pending"),
      second,
    ]);
  });

  test("does not persist mutation of an inserted record before its first write settles", async () => {
    const blocked = fakeAsyncStorageWithBlockedSet();
    const outbox = (Storage as any).thoughtSaveOutbox(
      DistortionData,
      blocked.storage
    );
    const gate = blocked.blockNextSet();
    const record = makeRecord(28, "pending");

    const insert = outbox.insert(record);
    record.status = "failed";
    record.lastError = "mutated before settle";
    gate.resolve();

    await insert;
    await expect(outbox.readAll()).resolves.toEqual([makeRecord(28, "pending")]);
  });

  test("rejects updates that change the immutable thought snapshot", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const record = makeRecord(22, "failed");

    await outbox.insert(record);

    await expect(
      outbox.update({
        ...record,
        thought: {
          ...record.thought,
          alternativeThought: "changed after submission",
        },
      })
    ).rejects.toThrow("immutable thought");
  });

  test("rejects cleanup-failed records that are not already marked thoughtPersisted", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);

    await expect(
      outbox.insert({
        ...makeRecord(23, "cleanup-failed"),
        thoughtPersisted: false,
      })
    ).rejects.toThrow("cleanup-failed");
  });

  test("rejects malformed persisted records during readAll hydration", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    const record = makeRecord(24, "cleanup-failed");
    await async.setItem(
      (Storage as any).THOUGHT_SAVE_OUTBOX_KEY,
      JSON.stringify({
        v: "thought-save-outbox/v1",
        records: [
          {
            ...record,
            submissionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            thought: {
              automaticThought: record.thought.automaticThought,
              cognitiveDistortions: Array.from(
                record.thought.cognitiveDistortions
              ).map((d) => d.slug),
              challenge: record.thought.challenge,
              alternativeThought: record.thought.alternativeThought,
              createdAt: record.thought.createdAt.toISOString(),
              updatedAt: record.thought.updatedAt.toISOString(),
              uuid: record.thought.uuid,
              v: "Thought-v2",
            },
            lastAttemptAt: record.lastAttemptAt.toISOString(),
            thoughtPersisted: false,
            updatedAt: record.updatedAt.toISOString(),
          },
        ],
      })
    );

    await expect(outbox.readAll()).rejects.toThrow();
  });

  test("rejects persisted outbox state above the maximum unresolved capacity", async () => {
    const async = fakeAsyncStorage();
    const records = Array.from({ length: 21 }, (_, index) => {
      const record = makeRecord(200 + index, "pending");
      return {
        ...record,
        thought: {
          automaticThought: record.thought.automaticThought,
          cognitiveDistortions: Array.from(
            record.thought.cognitiveDistortions
          ).map((d) => d.slug),
          challenge: record.thought.challenge,
          alternativeThought: record.thought.alternativeThought,
          createdAt: record.thought.createdAt.toISOString(),
          updatedAt: record.thought.updatedAt.toISOString(),
          uuid: record.thought.uuid,
          v: "Thought-v2",
        },
        lastAttemptAt: record.lastAttemptAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    });

    await async.setItem(
      (Storage as any).THOUGHT_SAVE_OUTBOX_KEY,
      JSON.stringify({
        v: "thought-save-outbox/v1",
        records,
      })
    );

    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);
    await expect(outbox.readAll()).rejects.toThrow("outbox capacity");
  });

  test("accounts for the maximum unresolved outbox slots without auto-eviction", async () => {
    const async = fakeAsyncStorage();
    const outbox = (Storage as any).thoughtSaveOutbox(DistortionData, async);

    for (let i = 0; i < 20; i += 1) {
      await outbox.insert(makeRecord(100 + i, "pending"));
    }

    await expect(outbox.readAll()).resolves.toHaveLength(20);
    await expect(outbox.insert(makeRecord(999, "pending"))).rejects.toThrow(
      "outbox capacity"
    );
    await expect(outbox.readAll()).resolves.toHaveLength(20);
  });
});
