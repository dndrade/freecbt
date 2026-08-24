import { DistortionData, Thought } from "@/model";
import { importLegacyAsyncStorageData } from "@/features/thoughtRecord/services/legacyImport";
import { HOME_THOUGHT_DRAFT_KEY } from "@/platform/storage/home-thought-draft";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/platform/storage/thought-save-outbox";
import { thoughtSaveOutboxService } from "@/features/thoughtRecord/services/thoughtSaveOutboxService";
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

test("legacy import remains retryable when a valid thought cannot be written", async () => {
  const thought = Thought.Thought.parse({uuid: "00000001-1111-4111-8111-000000000002", automaticThought: "a", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date(), updatedAt: new Date()});
  const key = `@Quirk:thoughts:${thought.uuid}`;
  const storage = createFakeAsyncStorage({[key]: Thought.createParsers(DistortionData).fromString.encode(thought)});
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};
  jest.spyOn(db, "runAsync").mockRejectedValueOnce(new Error("temporary SQLite failure"));

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).rejects.toThrow("temporary SQLite failure");
  expect(values.get("thoughtRecord:legacyImportComplete:v1")).toBeUndefined();
  expect(await storage.getItem(key)).not.toBeNull();

  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);
  expect(await thoughtsService(DistortionData, db).readAll()).toEqual([thought]);
  expect(values.get("thoughtRecord:legacyImportComplete:v1")).toBe("true");
});

test("legacy marker still migrates an unmigrated Home draft", async () => {
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
  const values = new Map([["thoughtRecord:legacyImportComplete:v1", "true"]]); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};

  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);

  expect(JSON.parse(values.get("thoughtRecord:wizard-session:v1")!)).toMatchObject({
    state: {automaticThought: "legacy"},
  });
});

test("legacy outbox import retries past an equivalent record after a later write fails", async () => {
  const first = Thought.Thought.parse({uuid: "00000001-1111-4111-8111-000000000003", automaticThought: "first", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date("2026-08-22T12:00:00.000Z"), updatedAt: new Date("2026-08-22T12:00:00.000Z")});
  const second = Thought.Thought.parse({uuid: "00000001-1111-4111-8111-000000000004", automaticThought: "second", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date("2026-08-22T12:00:00.000Z"), updatedAt: new Date("2026-08-22T12:00:00.000Z")});
  const record = (thought: Thought.Thought) => ({submissionId: thought.uuid, thought: Thought.createParsers(DistortionData).toJson.encode(thought), sourceDraftRevision: 1, attemptCount: 0, lastAttemptAt: "2026-08-22T12:00:00.000Z", lastError: null, retryRequested: false, thoughtPersisted: false, updatedAt: "2026-08-22T12:00:00.000Z", status: "pending"});
  const storage = createFakeAsyncStorage({[THOUGHT_SAVE_OUTBOX_KEY]: JSON.stringify({records: [record(first), record(second)]})});
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};
  const runAsync = db.runAsync.bind(db);
  jest.spyOn(db, "runAsync").mockImplementationOnce(runAsync).mockRejectedValueOnce(new Error("temporary SQLite failure"));

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).rejects.toThrow("temporary SQLite failure");
  expect((await thoughtSaveOutboxService(DistortionData, db).readAll()).map((entry) => entry.submissionId)).toEqual([first.uuid]);

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).resolves.toBeUndefined();
  expect((await thoughtSaveOutboxService(DistortionData, db).readAll()).map((entry) => entry.submissionId)).toEqual([first.uuid, second.uuid]);
  expect(values.get("thoughtRecord:legacyImportComplete:v1")).toBe("true");
});

test("legacy import retains an invalid outbox record without blocking readiness", async () => {
  const thought = Thought.Thought.parse({uuid: "00000001-1111-4111-8111-000000000005", automaticThought: "invalid", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date("2026-08-22T12:00:00.000Z"), updatedAt: new Date("2026-08-22T12:00:00.000Z")});
  const storage = createFakeAsyncStorage({[THOUGHT_SAVE_OUTBOX_KEY]: JSON.stringify({records: [{submissionId: "00000001-1111-4111-8111-000000000006", thought: Thought.createParsers(DistortionData).toJson.encode(thought), sourceDraftRevision: 1, attemptCount: 0, lastAttemptAt: "2026-08-22T12:00:00.000Z", lastError: null, retryRequested: false, thoughtPersisted: false, updatedAt: "2026-08-22T12:00:00.000Z", status: "pending"}]})});
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).resolves.toBeUndefined();
  expect(await thoughtSaveOutboxService(DistortionData, db).readAll()).toEqual([]);
  expect(values.get("thoughtRecord:legacyImportComplete:v1")).toBe("true");
  expect(await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY)).not.toBeNull();
});

test("legacy import retains malformed outbox metadata without blocking readiness", async () => {
  const storage = createFakeAsyncStorage({[THOUGHT_SAVE_OUTBOX_KEY]: JSON.stringify({records: {unexpected: true}})});
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).resolves.toBeUndefined();
  expect(values.get("thoughtRecord:legacyImportComplete:v1")).toBe("true");
  expect(await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY)).not.toBeNull();
});

test("legacy marker skips a corrupt Home draft without blocking readiness", async () => {
  const storage = createFakeAsyncStorage({[HOME_THOUGHT_DRAFT_KEY]: "not valid JSON"});
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map([["thoughtRecord:legacyImportComplete:v1", "true"]]); const mmkv = {getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key)};

  await expect(importLegacyAsyncStorageData(DistortionData, db, storage, mmkv)).resolves.toBeUndefined();
  expect(values.get("thoughtRecord:wizard-session:v1")).toBeUndefined();
  expect(await storage.getItem(HOME_THOUGHT_DRAFT_KEY)).toBe("not valid JSON");
});
