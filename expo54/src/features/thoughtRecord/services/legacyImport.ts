import type { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import { Distortion, Thought } from "@/model";
import { homeThoughtDraft } from "@/platform/storage/home-thought-draft";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/platform/storage/thought-save-outbox";
import type { ThoughtSaveOutboxRecord, ThoughtSaveOutboxStatus } from "@/model/thought-save";
import type { MmkvLike } from "@/services/storage/zustandStorage";
import { thoughtSaveOutboxService } from "./thoughtSaveOutboxService";
import { ZodError } from "zod";
import { thoughtsService } from "./thoughtsService";

const IMPORTED = "thoughtRecord:legacyImportComplete:v1";
const WIZARD_SESSION = "thoughtRecord:wizard-session:v1";
const outboxStatuses: readonly ThoughtSaveOutboxStatus[] = ["insertion-pending", "pending", "uncertain", "active", "failed", "cleanup-failed"];
async function importHomeDraft(data: Distortion.Data, storage: AsyncStorageStatic, mmkv: Pick<MmkvLike, "getString" | "set">) {
  if (mmkv.getString(WIZARD_SESSION) !== undefined) return;
  let draft;
  try { draft = await homeThoughtDraft(data, storage).read(); } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) return;
    throw error;
  }
  if (draft !== null) mmkv.set(WIZARD_SESSION, JSON.stringify({
    state: {
      currentSlide: "automatic-thought",
      automaticThought: draft.spec.automaticThought,
      selectedDistortionSlugs: Array.from(draft.spec.cognitiveDistortions, (distortion) => distortion.slug),
      challenge: draft.spec.challenge,
      alternativeThought: draft.spec.alternativeThought
    },
    version: 0
  }));
}

export async function importLegacyAsyncStorageData(data: Distortion.Data, db: SQLiteDatabase, storage: AsyncStorageStatic, mmkv: Pick<MmkvLike, "getString" | "set">) {
  if (mmkv.getString(IMPORTED) === "true") return importHomeDraft(data, storage, mmkv);
  const parser = Thought.createParsers(data), thoughts = thoughtsService(data, db), outbox = thoughtSaveOutboxService(data, db);
  const sameOutboxRecord = (left: ThoughtSaveOutboxRecord, right: ThoughtSaveOutboxRecord) => left.submissionId === right.submissionId
    && JSON.stringify(parser.toJson.encode(left.thought)) === JSON.stringify(parser.toJson.encode(right.thought))
    && left.sourceDraftRevision === right.sourceDraftRevision
    && left.attemptCount === right.attemptCount
    && left.lastAttemptAt.getTime() === right.lastAttemptAt.getTime()
    && left.lastError === right.lastError
    && left.retryRequested === right.retryRequested
    && left.thoughtPersisted === right.thoughtPersisted
    && left.updatedAt.getTime() === right.updatedAt.getTime()
    && left.status === right.status;
  for (const [, value] of await storage.multiGet((await storage.getAllKeys()).filter(Thought.isKey))) if (value !== null) {
    let thought: Thought.Thought;
    try { thought = parser.fromString.decode(value); } catch { continue; }
    await thoughts.write(thought);
  }
  const raw = await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY);
  if (raw) {
    let records: unknown[];
    try {
      const parsed = JSON.parse(raw) as { records?: unknown };
      records = Array.isArray(parsed.records) ? parsed.records : [];
    } catch { records = []; }
    for (const record of records) {
      let next: ThoughtSaveOutboxRecord;
      try {
        const r = record as Record<string, unknown>;
        if (typeof r.submissionId !== "string" || !Number.isInteger(r.sourceDraftRevision) || (r.sourceDraftRevision as number) < 0 || !Number.isInteger(r.attemptCount) || (r.attemptCount as number) < 0 || typeof r.lastAttemptAt !== "string" || (r.lastError !== null && typeof r.lastError !== "string") || typeof r.retryRequested !== "boolean" || typeof r.thoughtPersisted !== "boolean" || typeof r.updatedAt !== "string" || !outboxStatuses.includes(r.status as ThoughtSaveOutboxStatus)) continue;
        const submissionId = Thought.Id.decode(r.submissionId), thought = parser.toJson.decode(r.thought as never), lastAttemptAt = new Date(r.lastAttemptAt), updatedAt = new Date(r.updatedAt);
        if (Number.isNaN(lastAttemptAt.getTime()) || Number.isNaN(updatedAt.getTime()) || submissionId !== thought.uuid || (r.status === "cleanup-failed" && !r.thoughtPersisted)) continue;
        next = { submissionId, thought, sourceDraftRevision: r.sourceDraftRevision as number, attemptCount: r.attemptCount as number, lastAttemptAt, lastError: r.lastError as string | null, retryRequested: r.retryRequested as boolean, thoughtPersisted: r.thoughtPersisted as boolean, updatedAt, status: r.status as ThoughtSaveOutboxStatus };
      } catch { continue; }
      const existing = (await outbox.readAll()).find((entry) => entry.submissionId === next.submissionId);
      if (existing === undefined) await outbox.insert(next);
      else if (!sameOutboxRecord(existing, next)) throw new Error(`conflicting legacy outbox record: ${next.submissionId}`);
    }
  }
  await importHomeDraft(data, storage, mmkv);
  mmkv.set(IMPORTED, "true");
}
