import type { LocaleTag } from "@/src/i18n/use-i18n";
import * as Archive from "./archive/thoughts-archive";
import * as Model from "./model";
import * as Settings from "./settings";
import * as Thought from "./thought";

export type Action = ReturnType<
  | typeof modelReady
  | typeof setSessionAuthed
  | typeof setExistingUser
  | typeof beginOnboardingCompletion
  | typeof onboardingCompletionSucceeded
  | typeof onboardingCompletionFailed
  | typeof setReminders
  | typeof setPincode
  | typeof setHistoryLabel
  | typeof setLocale
  | typeof setTheme
  | typeof setDeviceColorScheme
  | typeof updateHomeThoughtDraft
  | typeof flushHomeThoughtDraft
  | typeof clearHomeThoughtDraft
  | typeof homeThoughtDraftWriteFailed
  | typeof homeThoughtDraftCleanupFailed
  | typeof createThought
  | typeof beginThoughtSave
  | typeof runThoughtSaveOutbox
  | typeof retryThoughtSave
  | typeof thoughtSaveOutboxInsertionSucceeded
  | typeof thoughtSaveOutboxInsertionFailed
  | typeof thoughtSaveOutboxUpdated
  | typeof thoughtSaveOutboxRemoved
  | typeof thoughtSaveOutboxRemovalFailed
  | typeof thoughtSaveWriteSucceeded
  | typeof thoughtSaveWriteFailed
  | typeof deleteThought
  | typeof updateThought
  | typeof importArchive
>;
export type Dispatch = (a: Action) => void;

export function setSessionAuthed(value: boolean) {
  return { action: "set-session-authed", value } as const;
}
export function setTheme(value: Model.ColorScheme | null) {
  return { action: "set-theme", value } as const;
}
export function setLocale(value: LocaleTag | null) {
  return { action: "set-locale", value } as const;
}
export function setHistoryLabel(value: Settings.HistoryLabel) {
  return { action: "set-history-label", value } as const;
}
export function setPincode(value: Settings.Pincode | null) {
  return { action: "set-pincode", value } as const;
}
export function setExistingUser() {
  return { action: "set-existing-user" } as const;
}
export function beginOnboardingCompletion() {
  return { action: "begin-onboarding-completion" } as const;
}
export function onboardingCompletionSucceeded() {
  return { action: "onboarding-completion-succeeded" } as const;
}
export function onboardingCompletionFailed(error: unknown) {
  return { action: "onboarding-completion-failed", error } as const;
}
export function setReminders(value: boolean) {
  return { action: "set-reminders", value } as const;
}
export function modelReady(model: Model.Ready) {
  return { action: "model-ready", model } as const;
}
export function setDeviceColorScheme(value: Model.Ready["deviceColorScheme"]) {
  return { action: "set-device-color-scheme", value } as const;
}
export function updateHomeThoughtDraft(spec: Thought.Spec, now: Date) {
  return { action: "update-home-thought-draft", spec, now } as const;
}
export function flushHomeThoughtDraft() {
  return { action: "flush-home-thought-draft" } as const;
}
export function clearHomeThoughtDraft() {
  return { action: "clear-home-thought-draft" } as const;
}
export function homeThoughtDraftWriteFailed(error: unknown) {
  return { action: "home-thought-draft-write-failed", error } as const;
}
export function homeThoughtDraftCleanupFailed(
  record: Model.Ready["homeThoughtDraft"] & object,
  outboxSubmissionId: Thought.Id,
  error: unknown,
  now: Date
) {
  return {
    action: "home-thought-draft-cleanup-failed",
    record,
    outboxSubmissionId,
    error,
    now,
  } as const;
}
/**
 * Where a submission came from. Only "home" is tied to Home's durable draft, so
 * only "home" may trigger the draft cleanup that follows a durable save.
 */
export type ThoughtSaveOrigin = "home" | "standalone";
export function createThought(
  spec: Thought.Spec,
  now: Date,
  origin: ThoughtSaveOrigin = "home"
) {
  return { action: "create-thought", spec, now, origin } as const;
}
export function beginThoughtSave(submissionId: Thought.Id, now: Date) {
  return { action: "begin-thought-save", submissionId, now } as const;
}
export function runThoughtSaveOutbox(now: Date) {
  return { action: "run-thought-save-outbox", now } as const;
}
export function retryThoughtSave(submissionId: Thought.Id) {
  return { action: "retry-thought-save", submissionId } as const;
}
export function thoughtSaveOutboxInsertionSucceeded(
  submissionId: Thought.Id,
  now: Date
) {
  return { action: "thought-save-outbox-insertion-succeeded", submissionId, now } as const;
}
export function thoughtSaveOutboxInsertionFailed(
  submissionId: Thought.Id,
  error: unknown
) {
  return {
    action: "thought-save-outbox-insertion-failed",
    submissionId,
    error,
  } as const;
}
export function thoughtSaveOutboxUpdated(
  value: Model.Ready["thoughtSaveOutbox"][number]
) {
  return { action: "thought-save-outbox-updated", value } as const;
}
export function thoughtSaveOutboxRemoved(submissionId: Thought.Id, now: Date) {
  return { action: "thought-save-outbox-removed", submissionId, now } as const;
}
export function thoughtSaveOutboxRemovalFailed(
  submissionId: Thought.Id,
  error: unknown,
  now: Date
) {
  return {
    action: "thought-save-outbox-removal-failed",
    submissionId,
    error,
    now,
  } as const;
}
export function thoughtSaveWriteSucceeded(
  submissionId: Thought.Id,
  thought: Thought.Thought
) {
  return { action: "thought-save-write-succeeded", submissionId, thought } as const;
}
export function thoughtSaveWriteFailed(
  submissionId: Thought.Id,
  error: unknown,
  now: Date
) {
  return {
    action: "thought-save-write-failed",
    submissionId,
    error,
    now,
  } as const;
}
export function deleteThought(value: Thought.Id) {
  return { action: "delete-thought", value } as const;
}
export function updateThought(value: Thought.Thought) {
  return { action: "update-thought", value } as const;
}
export function importArchive(value: Archive.Archive) {
  return { action: "import-archive", value } as const;
}
