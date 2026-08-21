import type { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";
import { Distortion, Thought } from "@/model";
import { HOME_THOUGHT_DRAFT_KEY } from "@/platform/storage/home-thought-draft";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/platform/storage/thought-save-outbox";
import type { MmkvLike } from "@/services/storage/zustandStorage";
import { thoughtSaveOutboxService } from "./thoughtSaveOutboxService";
import { thoughtsService } from "./thoughtsService";

const IMPORTED = "thoughtRecord:legacyImportComplete:v1";
const DRAFT = "thoughtRecord:draft:v1";
export async function importLegacyAsyncStorageData(data: Distortion.Data, db: SQLiteDatabase, storage: AsyncStorageStatic, mmkv: MmkvLike) {
  if (mmkv.getString(IMPORTED) === "true") return;
  const parser = Thought.createParsers(data), thoughts = thoughtsService(data, db), outbox = thoughtSaveOutboxService(data, db);
  for (const [, value] of await storage.multiGet((await storage.getAllKeys()).filter(Thought.isKey))) if (value !== null) try { await thoughts.write(parser.fromString.decode(value)); } catch { /* retain legacy data; skip invalid rows */ }
  const raw = await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY);
  if (raw) for (const record of (JSON.parse(raw) as { records?: unknown[] }).records ?? []) try {
    const r = record as Record<string, unknown>;
    await outbox.insert({ submissionId: r.submissionId as Thought.Id, thought: parser.toJson.decode(r.thought as never), sourceDraftRevision: r.sourceDraftRevision as number, attemptCount: r.attemptCount as number, lastAttemptAt: new Date(r.lastAttemptAt as string), lastError: r.lastError as string | null, retryRequested: r.retryRequested as boolean, thoughtPersisted: r.thoughtPersisted as boolean, updatedAt: new Date(r.updatedAt as string), status: r.status as Parameters<typeof outbox.insert>[0]["status"] });
  } catch { /* retain legacy data; skip invalid rows */ }
  const draft = await storage.getItem(HOME_THOUGHT_DRAFT_KEY);
  if (draft !== null) mmkv.set(DRAFT, draft);
  mmkv.set(IMPORTED, "true");
}
