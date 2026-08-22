import type { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import { Distortion, Thought } from "@/model";
import { homeThoughtDraft } from "@/platform/storage/home-thought-draft";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/platform/storage/thought-save-outbox";
import type { MmkvLike } from "@/services/storage/zustandStorage";
import { thoughtSaveOutboxService } from "./thoughtSaveOutboxService";
import { thoughtsService } from "./thoughtsService";

const IMPORTED = "thoughtRecord:legacyImportComplete:v1";
const WIZARD_SESSION = "thoughtRecord:wizard-session:v1";
async function importHomeDraft(data: Distortion.Data, storage: AsyncStorageStatic, mmkv: Pick<MmkvLike, "getString" | "set">) {
  if (mmkv.getString(WIZARD_SESSION) !== undefined) return;
  const draft = await homeThoughtDraft(data, storage).read();
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
  for (const [, value] of await storage.multiGet((await storage.getAllKeys()).filter(Thought.isKey))) if (value !== null) {
    let thought: Thought.Thought;
    try { thought = parser.fromString.decode(value); } catch { continue; }
    await thoughts.write(thought);
  }
  const raw = await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY);
  if (raw) {
    let records: unknown[];
    try { records = (JSON.parse(raw) as { records?: unknown[] }).records ?? []; } catch { records = []; }
    for (const record of records) {
      let thought: Thought.Thought;
      try {
        const r = record as Record<string, unknown>;
        thought = parser.toJson.decode(r.thought as never);
      } catch { continue; }
      const r = record as Record<string, unknown>;
      await outbox.insert({ submissionId: r.submissionId as Thought.Id, thought, sourceDraftRevision: r.sourceDraftRevision as number, attemptCount: r.attemptCount as number, lastAttemptAt: new Date(r.lastAttemptAt as string), lastError: r.lastError as string | null, retryRequested: r.retryRequested as boolean, thoughtPersisted: r.thoughtPersisted as boolean, updatedAt: new Date(r.updatedAt as string), status: r.status as Parameters<typeof outbox.insert>[0]["status"] });
    }
  }
  await importHomeDraft(data, storage, mmkv);
  mmkv.set(IMPORTED, "true");
}
