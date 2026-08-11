import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { Distortion, Thought } from "@/src/model";
import { z } from "zod";
import { createOrderedStorageWriter } from "./serialized-storage-writer";

export const THOUGHT_SAVE_OUTBOX_KEY = "@Quirk:thought-save-outbox:v1";
export const MAX_THOUGHT_SAVE_OUTBOX_RECORDS = 20;

const OutboxStatus = z.enum([
  "insertion-pending",
  "pending",
  "uncertain",
  "active",
  "failed",
  "cleanup-failed",
]);

const OutboxRecordJson = z.object({
  submissionId: z.string(),
  thought: Thought.Json,
  sourceDraftRevision: z.number().int().nonnegative(),
  attemptCount: z.number().int().nonnegative(),
  lastAttemptAt: z.iso.datetime(),
  lastError: z.string().nullable(),
  retryRequested: z.boolean(),
  thoughtPersisted: z.boolean(),
  updatedAt: z.iso.datetime(),
  status: OutboxStatus,
});

const OutboxJson = z.object({
  v: z.literal("thought-save-outbox/v1"),
  records: OutboxRecordJson.array(),
});

export type ThoughtSaveOutboxStatus = z.infer<typeof OutboxStatus>;

export interface ThoughtSaveOutboxRecord {
  submissionId: Thought.Id;
  thought: Thought.Thought;
  sourceDraftRevision: number;
  attemptCount: number;
  lastAttemptAt: Date;
  lastError: string | null;
  retryRequested: boolean;
  thoughtPersisted: boolean;
  updatedAt: Date;
  status: ThoughtSaveOutboxStatus;
}

function assertStatusInvariant(record: ThoughtSaveOutboxRecord): void {
  if (record.status === "cleanup-failed" && !record.thoughtPersisted) {
    throw new Error(
      "cleanup-failed records must already be marked thoughtPersisted"
    );
  }
}

function assertSubmissionIdentity(record: ThoughtSaveOutboxRecord): void {
  if (record.submissionId !== record.thought.uuid) {
    throw new Error("submission identity must match thought.uuid");
  }
}

export function thoughtSaveOutbox(
  data: Distortion.Data,
  storage: AsyncStorageStatic
) {
  const thoughts = Thought.createParsers(data);

  function encodeRecordWith(
    parsers: ReturnType<typeof Thought.createParsers>,
    record: ThoughtSaveOutboxRecord
  ) {
    return {
      submissionId: record.submissionId,
      thought: parsers.toJson.encode(record.thought),
      sourceDraftRevision: record.sourceDraftRevision,
      attemptCount: record.attemptCount,
      lastAttemptAt: record.lastAttemptAt.toISOString(),
      lastError: record.lastError,
      retryRequested: record.retryRequested,
      thoughtPersisted: record.thoughtPersisted,
      updatedAt: record.updatedAt.toISOString(),
      status: record.status,
    } satisfies z.infer<typeof OutboxRecordJson>;
  }

  function encodeRecord(record: ThoughtSaveOutboxRecord) {
    return encodeRecordWith(thoughts, record);
  }

  function decodeRecordWith(
    parsers: ReturnType<typeof Thought.createParsers>,
    record: z.infer<typeof OutboxRecordJson>
  ): ThoughtSaveOutboxRecord {
    return {
      submissionId: Thought.Id.decode(record.submissionId),
      thought: parsers.toJson.decode(record.thought),
      sourceDraftRevision: record.sourceDraftRevision,
      attemptCount: record.attemptCount,
      lastAttemptAt: new Date(record.lastAttemptAt),
      lastError: record.lastError,
      retryRequested: record.retryRequested,
      thoughtPersisted: record.thoughtPersisted,
      updatedAt: new Date(record.updatedAt),
      status: record.status,
    };
  }

  function decodeRecord(record: z.infer<typeof OutboxRecordJson>): ThoughtSaveOutboxRecord {
    return decodeRecordWith(thoughts, record);
  }

  function cloneRecords(
    records: readonly ThoughtSaveOutboxRecord[]
  ): readonly ThoughtSaveOutboxRecord[] {
    return records.map((record) => decodeRecordWith(thoughts, encodeRecordWith(thoughts, record)));
  }

  function cloneRecord(record: ThoughtSaveOutboxRecord): ThoughtSaveOutboxRecord {
    return cloneRecords([record])[0];
  }

  async function persist(records: readonly ThoughtSaveOutboxRecord[]): Promise<void> {
    await storage.setItem(
      THOUGHT_SAVE_OUTBOX_KEY,
      JSON.stringify({
        v: "thought-save-outbox/v1",
        records: records.map(encodeRecord),
      } satisfies z.input<typeof OutboxJson>)
    );
  }

  async function readPersisted(): Promise<readonly ThoughtSaveOutboxRecord[]> {
    const raw = await storage.getItem(THOUGHT_SAVE_OUTBOX_KEY);
    if (raw === null) return [];
    const json = OutboxJson.parse(JSON.parse(raw));
    const records = json.records.map(decodeRecord);
    if (records.length > MAX_THOUGHT_SAVE_OUTBOX_RECORDS) {
      throw new Error("outbox capacity exceeded");
    }
    const seen = new Set<string>();
    for (const record of records) {
      assertSubmissionIdentity(record);
      assertStatusInvariant(record);
      if (seen.has(record.submissionId)) {
        throw new Error(`duplicate submission id: ${record.submissionId}`);
      }
      seen.add(record.submissionId);
    }
    return records;
  }

  const writer = createOrderedStorageWriter<readonly ThoughtSaveOutboxRecord[]>({
    load: readPersisted,
    clone: cloneRecords,
    persist,
  });

  async function readAll(): Promise<readonly ThoughtSaveOutboxRecord[]> {
    return writer.read();
  }

  async function insert(record: ThoughtSaveOutboxRecord): Promise<void> {
    const snapshot = cloneRecord(record);
    assertSubmissionIdentity(snapshot);
    assertStatusInvariant(snapshot);
    await writer.mutate((state) => {
      const records = [...state];
      if (records.length >= MAX_THOUGHT_SAVE_OUTBOX_RECORDS) {
        throw new Error("outbox capacity exceeded");
      }
      if (records.some((r) => r.submissionId === snapshot.submissionId)) {
        throw new Error(`duplicate submission id: ${snapshot.submissionId}`);
      }
      records.push(snapshot);
      return { state: records };
    });
  }

  async function update(record: ThoughtSaveOutboxRecord): Promise<void> {
    const snapshot = cloneRecord(record);
    assertSubmissionIdentity(snapshot);
    assertStatusInvariant(snapshot);
    await writer.mutate((state) => {
      const records = [...state];
      const index = records.findIndex((r) => r.submissionId === snapshot.submissionId);
      if (index < 0) {
        throw new Error(`missing outbox record: ${snapshot.submissionId}`);
      }
      const existing = records[index];
      if (
        JSON.stringify(encodeRecord(existing).thought) !==
        JSON.stringify(encodeRecord(snapshot).thought)
      ) {
        throw new Error("immutable thought snapshot cannot change");
      }
      records[index] = snapshot;
      return { state: records };
    });
  }

  async function remove(submissionId: Thought.Id): Promise<void> {
    await writer.mutate((state) => ({
      state: state.filter((r) => r.submissionId !== submissionId),
    }));
  }

  return { readAll, insert, update, remove };
}

export type ThoughtSaveOutbox = ReturnType<typeof thoughtSaveOutbox>;
