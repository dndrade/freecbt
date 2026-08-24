import type { SQLiteDatabase } from "expo-sqlite";
import { Distortion, Thought } from "@/model";
import type {
  ThoughtSaveOutboxRecord,
  ThoughtSaveOutboxStatus,
} from "@/model/thought-save";

export const MAX_THOUGHT_SAVE_OUTBOX_RECORDS = 20;
type Row = {
  submission_id: string;
  thought_json: string;
  source_draft_revision: number;
  attempt_count: number;
  last_attempt_at: string;
  last_error: string | null;
  retry_requested: number;
  thought_persisted: number;
  updated_at: string;
  status: ThoughtSaveOutboxStatus;
};

export function thoughtSaveOutboxService(
  data: Distortion.Data,
  db: SQLiteDatabase,
) {
  const thoughts = Thought.createParsers(data);
  const assert = (r: ThoughtSaveOutboxRecord) => {
    if (r.submissionId !== r.thought.uuid)
      throw new Error("submission identity must match thought.uuid");
    if (r.status === "cleanup-failed" && !r.thoughtPersisted)
      throw new Error(
        "cleanup-failed records must already be marked thoughtPersisted",
      );
  };
  const fromRow = (r: Row): ThoughtSaveOutboxRecord => ({
    submissionId: r.submission_id as Thought.Id,
    thought: thoughts.toJson.decode(JSON.parse(r.thought_json)),
    sourceDraftRevision: r.source_draft_revision,
    attemptCount: r.attempt_count,
    lastAttemptAt: new Date(r.last_attempt_at),
    lastError: r.last_error,
    retryRequested: r.retry_requested === 1,
    thoughtPersisted: r.thought_persisted === 1,
    updatedAt: new Date(r.updated_at),
    status: r.status,
  });
  const params = (r: ThoughtSaveOutboxRecord) => [
    r.submissionId,
    JSON.stringify(thoughts.toJson.encode(r.thought)),
    r.sourceDraftRevision,
    r.attemptCount,
    r.lastAttemptAt.toISOString(),
    r.lastError,
    r.retryRequested ? 1 : 0,
    r.thoughtPersisted ? 1 : 0,
    r.updatedAt.toISOString(),
    r.status,
  ];

  async function readAll() {
    return (
      await db.getAllAsync<Row>(
        "SELECT * FROM thought_save_outbox ORDER BY rowid ASC",
      )
    ).map(fromRow);
  }

  async function insert(record: ThoughtSaveOutboxRecord) {
    assert(record);
    await db.withTransactionAsync(async () => {
      if (
        ((
          await db.getFirstAsync<{
            count: number;
          }>("SELECT COUNT(*) as count FROM thought_save_outbox")
        )?.count ?? 0) >= 20
      )
        throw new Error("outbox capacity exceeded");
      if (
        await db.getFirstAsync(
          "SELECT submission_id FROM thought_save_outbox WHERE submission_id = ?",
          [record.submissionId],
        )
      )
        throw new Error(`duplicate submission id: ${record.submissionId}`);
      await db.runAsync(
        "INSERT INTO thought_save_outbox (submission_id, thought_json, source_draft_revision, attempt_count, last_attempt_at, last_error, retry_requested, thought_persisted, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params(record),
      );
    });
  }

  async function update(record: ThoughtSaveOutboxRecord) {
    assert(record);
    const existing = await db.getFirstAsync<Row>(
      "SELECT * FROM thought_save_outbox WHERE submission_id = ?",
      [record.submissionId],
    );
    if (!existing)
      throw new Error(`missing outbox record: ${record.submissionId}`);
    if (
      JSON.stringify(thoughts.toJson.encode(fromRow(existing).thought)) !==
      JSON.stringify(thoughts.toJson.encode(record.thought))
    )
      throw new Error("immutable thought snapshot cannot change");
    const p = params(record);
    await db.runAsync(
      "UPDATE thought_save_outbox SET thought_json=?, source_draft_revision=?, attempt_count=?, last_attempt_at=?, last_error=?, retry_requested=?, thought_persisted=?, updated_at=?, status=? WHERE submission_id=?",
      [...p.slice(1), record.submissionId],
    );
  }

  async function remove(id: Thought.Id) {
    await db.runAsync(
      "DELETE FROM thought_save_outbox WHERE submission_id = ?",
      [id],
    );
  }

  return { readAll, insert, update, remove };
}

export type ThoughtSaveOutboxService = ReturnType<
  typeof thoughtSaveOutboxService
>;
