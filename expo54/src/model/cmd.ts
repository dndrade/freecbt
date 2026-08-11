import { Href } from "expo-router";
import * as Settings from "./settings";
import * as Thought from "./thought";
import type {
  HomeThoughtDraftRecord,
  ThoughtSaveOutboxRecord,
} from "../platform/storage/storage";

export type Cmd =
  | typeof loadModel
  | ReturnType<
      | typeof writeSettings
      | typeof completeOnboarding
      | typeof writeHomeThoughtDraft
      | typeof clearHomeThoughtDraft
      | typeof insertThoughtSaveOutbox
      | typeof updateThoughtSaveOutbox
      | typeof removeThoughtSaveOutbox
      | typeof writeThought
      | typeof deleteThought
      | typeof navigate
    >;
export type List = readonly Cmd[];

export const loadModel = { cmd: "load-model" } as const;
export function writeSettings(value: Settings.Settings) {
  return { cmd: "write-settings", value } as const;
}
export function completeOnboarding(value: Settings.Settings) {
  return { cmd: "complete-onboarding", value } as const;
}
export function writeHomeThoughtDraft(value: HomeThoughtDraftRecord) {
  return { cmd: "write-home-thought-draft", value } as const;
}
export function clearHomeThoughtDraft() {
  return { cmd: "clear-home-thought-draft" } as const;
}
export function insertThoughtSaveOutbox(value: ThoughtSaveOutboxRecord) {
  return { cmd: "insert-thought-save-outbox", value } as const;
}
export function updateThoughtSaveOutbox(value: ThoughtSaveOutboxRecord) {
  return { cmd: "update-thought-save-outbox", value } as const;
}
export function removeThoughtSaveOutbox(value: Thought.Id) {
  return { cmd: "remove-thought-save-outbox", value } as const;
}
export function writeThought(value: Thought.Thought) {
  return { cmd: "write-thought", value } as const;
}
export function deleteThought(value: Thought.Key) {
  return { cmd: "delete-thought", value } as const;
}
export function navigate(value: Href) {
  return { cmd: "navigate", value } as const;
}
