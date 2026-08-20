import { generateMockRecoveryKey } from "./fixtures";
import React from "react";

export type Screen =
  | "inactive"
  | "enable"
  | "recovery-intro"
  | "save-key"
  | "manual-save"
  | "confirm"
  | "active";

export type Sheet = "none" | "password-manager" | "learn-more" | "final-notice";

export interface FlowState {
  readonly screen: Screen;
  readonly sheet: Sheet;
  readonly mockKey: string;
  readonly confirmInput: string;
  readonly copiedFeedback: boolean;
  readonly backupEnabled: boolean;
  readonly recoveryKeyGenerated: boolean;
  readonly recoveryKeyViewed: boolean;
  readonly recoveryKeySavedIntent: "none" | "password_manager" | "manual";
  readonly recoveryKeyConfirmed: boolean;
  readonly firstBackupStatus: "not_started" | "starting";
  readonly lastBackupAt: string | null;
}

export type FlowAction =
  | { readonly type: "SET_UP" }
  | { readonly type: "ENABLE" }
  | { readonly type: "LEARN_MORE" }
  | { readonly type: "VIEW_KEY" }
  | { readonly type: "SEE_FULL_KEY" }
  | { readonly type: "CHOOSE_PASSWORD_MANAGER" }
  | { readonly type: "CHOOSE_MANUAL" }
  | { readonly type: "PASSWORD_MANAGER_CONTINUE" }
  | { readonly type: "PASSWORD_MANAGER_CANCEL" }
  | { readonly type: "COPY_TO_CLIPBOARD" }
  | { readonly type: "MANUAL_NEXT" }
  | { readonly type: "CONFIRM_INPUT_CHANGED"; readonly value: string }
  | { readonly type: "PASTE_FROM_PASSWORD_MANAGER" }
  | { readonly type: "CONFIRM_NEXT" }
  | { readonly type: "SEE_KEY_AGAIN" }
  | { readonly type: "SHEET_DISMISSED" }
  | { readonly type: "FINAL_NOTICE_CONTINUE" }
  | { readonly type: "RESET" };

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function init(mockKey?: string): FlowState {
  return {
    screen: "inactive",
    sheet: "none",
    mockKey: mockKey ?? generateMockRecoveryKey(),
    confirmInput: "",
    copiedFeedback: false,
    backupEnabled: false,
    recoveryKeyGenerated: false,
    recoveryKeyViewed: false,
    recoveryKeySavedIntent: "none",
    recoveryKeyConfirmed: false,
    firstBackupStatus: "not_started",
    lastBackupAt: null,
  };
}

export function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SET_UP":
      return { ...state, screen: "enable" };
    case "ENABLE":
      return { ...state, screen: "recovery-intro" };
    case "LEARN_MORE":
      return { ...state, sheet: "learn-more" };
    case "VIEW_KEY":
      return { ...state, screen: "save-key", recoveryKeyGenerated: true };
    case "SEE_FULL_KEY":
      return { ...state, screen: "manual-save", recoveryKeyViewed: true };
    case "CHOOSE_PASSWORD_MANAGER":
      return { ...state, sheet: "password-manager" };
    case "CHOOSE_MANUAL":
      return { ...state, screen: "manual-save", recoveryKeyViewed: true };
    case "PASSWORD_MANAGER_CONTINUE":
      return {
        ...state,
        sheet: "none",
        screen: "confirm",
        recoveryKeySavedIntent: "password_manager",
      };
    case "PASSWORD_MANAGER_CANCEL":
      return { ...state, sheet: "none" };
    case "COPY_TO_CLIPBOARD":
      return { ...state, copiedFeedback: true };
    case "MANUAL_NEXT":
      return {
        ...state,
        screen: "confirm",
        recoveryKeyViewed: true,
        recoveryKeySavedIntent: "manual",
      };
    case "CONFIRM_INPUT_CHANGED":
      return { ...state, confirmInput: action.value };
    case "PASTE_FROM_PASSWORD_MANAGER":
      return { ...state, confirmInput: state.mockKey };
    case "CONFIRM_NEXT":
      if (normalize(state.confirmInput) !== normalize(state.mockKey)) return state;
      return { ...state, recoveryKeyConfirmed: true, sheet: "final-notice" };
    case "SEE_KEY_AGAIN":
      return { ...state, sheet: "none", screen: "manual-save" };
    case "SHEET_DISMISSED":
      if (state.sheet === "final-notice") {
        return { ...state, sheet: "none", screen: "manual-save" };
      }
      return { ...state, sheet: "none" };
    case "FINAL_NOTICE_CONTINUE":
      return {
        ...state,
        sheet: "none",
        screen: "active",
        backupEnabled: true,
        firstBackupStatus: "starting",
      };
    case "RESET":
      return init(state.mockKey);
    default:
      return state;
  }
}

export function useSecureBackupsFlow(initialMockKey?: string) {
  return React.useReducer(reducer, initialMockKey, init);
}
