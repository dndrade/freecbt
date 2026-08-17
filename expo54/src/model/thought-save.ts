import type * as Thought from "./thought";

export type HomeThoughtDraftCleanup = {
  status: "none" | "clear-failed";
  sourceRevision: number;
  outboxSubmissionId: Thought.Id;
  lastError: string | null;
  updatedAt: Date;
};

export interface HomeThoughtDraftRecord {
  spec: Thought.Spec;
  sourceRevision: number;
  updatedAt: Date;
  draftCleanup: HomeThoughtDraftCleanup | null;
}

export type ThoughtSaveOutboxStatus =
  | "insertion-pending"
  | "pending"
  | "uncertain"
  | "active"
  | "failed"
  | "cleanup-failed";

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
