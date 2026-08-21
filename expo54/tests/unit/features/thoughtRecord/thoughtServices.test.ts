import { DistortionData, Thought } from "@/model";
import { migrate } from "@/services/database/migrator";
import { createFakeSqliteDatabase } from "@/tests/support/sqlite";
import { thoughtSaveOutboxService } from "@/features/thoughtRecord/services/thoughtSaveOutboxService";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";

function thought(i: number): Thought.Thought { return Thought.Thought.parse({ uuid: `${String(i).padStart(8, "0")}-1111-4111-8111-${String(i).padStart(12, "0")}`, automaticThought: `thought-${i}`, cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "challenge", alternativeThought: "alternative", createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)), updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 1, i)) }); }
async function setup() { const db = createFakeSqliteDatabase(); await migrate(db); return db; }

test("thought service round-trips and rejects conflicting replay", async () => {
  const service = thoughtsService(DistortionData, await setup()), value = thought(1);
  await service.persistSubmittedThought(value.uuid, value);
  await service.persistSubmittedThought(value.uuid, value);
  expect(await service.readAll()).toEqual([value]);
  await expect(service.persistSubmittedThought(value.uuid, { ...value, challenge: "other" })).rejects.toThrow("conflicting record already exists");
});

test("outbox enforces duplicate and immutable snapshot invariants", async () => {
  const service = thoughtSaveOutboxService(DistortionData, await setup()), value = thought(1);
  const record = { submissionId: value.uuid, thought: value, sourceDraftRevision: 1, attemptCount: 0, lastAttemptAt: new Date(), lastError: null, retryRequested: false, thoughtPersisted: false, updatedAt: new Date(), status: "insertion-pending" as const };
  await service.insert(record);
  await expect(service.insert(record)).rejects.toThrow("duplicate submission id");
  await expect(service.update({ ...record, thought: { ...value, challenge: "other" } })).rejects.toThrow("immutable thought snapshot cannot change");
});
