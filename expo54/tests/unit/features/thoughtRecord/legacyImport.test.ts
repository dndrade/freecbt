import { DistortionData, Thought } from "@/model";
import { importLegacyAsyncStorageData } from "@/features/thoughtRecord/services/legacyImport";
import { HOME_THOUGHT_DRAFT_KEY } from "@/platform/storage/home-thought-draft";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { migrate } from "@/services/database/migrator";
import { createFakeAsyncStorage } from "@/tests/support/async-storage";
import { createFakeSqliteDatabase } from "@/tests/support/sqlite";

test("legacy import is non-destructive and runs once", async () => {
  const thought = Thought.Thought.parse({ uuid: "00000001-1111-4111-8111-000000000001", automaticThought: "a", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date(), updatedAt: new Date() });
  const storage = createFakeAsyncStorage({ [`@Quirk:thoughts:${thought.uuid}`]: Thought.createParsers(DistortionData).fromString.encode(thought) });
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = { getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key) };
  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);
  expect(await thoughtsService(DistortionData, db).readAll()).toEqual([thought]);
  await thoughtsService(DistortionData, db).clear(); await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);
  expect(await thoughtsService(DistortionData, db).readAll()).toEqual([]);
  expect(await storage.getItem(`@Quirk:thoughts:${thought.uuid}`)).not.toBeNull();
});

test("legacy import converts a Home draft to the wizard session without cleanup metadata", async () => {
  const storage = createFakeAsyncStorage({
    [HOME_THOUGHT_DRAFT_KEY]: JSON.stringify({
      v: "home-thought-draft/v1",
      spec: {
        automaticThought: "I made a mistake",
        cognitiveDistortions: ["all-or-nothing"],
        challenge: "One mistake is not everything",
        alternativeThought: "I can learn from it",
      },
      sourceRevision: 7,
      updatedAt: "2026-08-22T12:00:00.000Z",
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: 7,
        outboxSubmissionId: "00000001-1111-4111-8111-000000000001",
        lastError: "retry me",
        updatedAt: "2026-08-22T12:01:00.000Z",
      },
    }),
  });
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = { getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key) };

  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);

  expect(JSON.parse(values.get("thoughtRecord:wizard-session:v1")!)).toEqual({
    state: {
      currentSlide: "automatic-thought",
      automaticThought: "I made a mistake",
      selectedDistortionSlugs: ["all-or-nothing"],
      challenge: "One mistake is not everything",
      alternativeThought: "I can learn from it",
    },
    version: 0,
  });
});

test("legacy import does not overwrite an existing wizard session", async () => {
  const storage = createFakeAsyncStorage({
    [HOME_THOUGHT_DRAFT_KEY]: JSON.stringify({
      v: "home-thought-draft/v1",
      spec: {automaticThought: "legacy", cognitiveDistortions: [], challenge: "", alternativeThought: ""},
      sourceRevision: 1,
      updatedAt: "2026-08-22T12:00:00.000Z",
      draftCleanup: null,
    }),
  });
  const db = createFakeSqliteDatabase(); await migrate(db);
  const existing = JSON.stringify({state: {automaticThought: "keep"}, version: 0});
  const values = new Map([["thoughtRecord:wizard-session:v1", existing]]); const mmkv = { getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key) };

  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);

  expect(values.get("thoughtRecord:wizard-session:v1")).toBe(existing);
});
