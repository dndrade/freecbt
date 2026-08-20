import { generateMockRecoveryKey } from "./fixtures";
import React from "react";
import { Screen, Section } from "@/src/components";
import { BottomSheet, Button, Typography } from "heroui-native";
import { View } from "react-native";

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

function LearnMoreSheet(props: { readonly isOpen: boolean; readonly onOpenChange: (open: boolean) => void }) {
  // gorhom's bottom sheet content stays mounted (just animated off-screen) once opened,
  // so it never unmounts on close. Gate mounting on isOpen ourselves instead.
  if (!props.isOpen) return null;

  return (
    <BottomSheet isOpen onOpenChange={props.onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content onClose={undefined}>
          <View testID="sb-sheet-learn-more" className="px-4 pt-3 gap-3">
            <View className="flex-row items-center gap-2">
              <View className="w-11" />
              <View className="flex-1 items-center">
                <BottomSheet.Title className="text-xl font-semibold tracking-tight text-foreground">
                  About secure backups
                </BottomSheet.Title>
              </View>
              <BottomSheet.Close testID="sb-learn-more-close" accessibilityLabel="Close" className="h-11 w-11 items-center justify-center" />
            </View>
            <Typography type="body-sm">Saved locally on this phone, not to FreeCBT cloud.</Typography>
            <Typography type="body-sm">End-to-end encrypted.</Typography>
            <Typography type="body-sm">Optional.</Typography>
            <Typography type="body-sm">Delete anytime.</Typography>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

export function SecureBackupsFlowPrototype(props: { readonly initialMockKey?: string }) {
  const [state, dispatch] = useSecureBackupsFlow(props.initialMockKey);

  function onLearnMoreOpenChange(open: boolean) {
    if (!open) dispatch({ type: "SHEET_DISMISSED" });
  }

  if (state.screen === "inactive") {
    return (
      <Screen scroll={false} contentClassName="gap-4 py-4" testID="sb-screen-inactive">
        <Section>
          <Typography type="h4" accessibilityRole="header">Backups</Typography>
          <Typography type="body-sm" color="muted">
            Automatic encrypted backups are saved to this phone.
          </Typography>
        </Section>
        <Section>
          <Typography type="h4">FreeCBT Secure Backups</Typography>
          <Typography type="body-sm">
            Create a secure backup file that&apos;s saved outside FreeCBT&apos;s app storage.
          </Typography>
        </Section>
        <Section>
          <Typography type="body-sm" color="muted">Status</Typography>
          <Typography type="body" weight="semibold">Not set up</Typography>
        </Section>
        <Section>
          <Button testID="sb-set-up" onPress={() => dispatch({ type: "SET_UP" })}>
            Set up backups
          </Button>
          <Typography type="body-sm" color="muted" className="mt-2">
            Saved locally on this phone, not to FreeCBT cloud.
          </Typography>
        </Section>
        <LearnMoreSheet isOpen={state.sheet === "learn-more"} onOpenChange={onLearnMoreOpenChange} />
      </Screen>
    );
  }

  if (state.screen === "enable") {
    return (
      <Screen scroll={false} contentClassName="gap-4 py-4" testID="sb-screen-enable">
        <Section>
          <Typography type="h4" accessibilityRole="header">Secure Backups</Typography>
          <Typography type="body-sm" color="muted">
            Backup thoughts using secure, end-to-end encrypted local storage.
          </Typography>
        </Section>
        <Section>
          <Typography type="h4">Never lose your data on this phone</Typography>
          <Typography type="body-sm">
            Your backup file may remain available even if the app is deleted or reinstalled.
          </Typography>
          <View className="flex-row gap-2 mt-2">
            <Typography type="body-sm" color="muted">End-to-end encrypted</Typography>
            <Typography type="body-sm" color="muted">Optional</Typography>
            <Typography type="body-sm" color="muted">Delete anytime</Typography>
          </View>
        </Section>
        <Section>
          <Button testID="sb-enable" onPress={() => dispatch({ type: "ENABLE" })}>
            Enable
          </Button>
          <Button testID="sb-learn-more" variant="secondary" onPress={() => dispatch({ type: "LEARN_MORE" })}>
            Learn more
          </Button>
        </Section>
        <LearnMoreSheet isOpen={state.sheet === "learn-more"} onOpenChange={onLearnMoreOpenChange} />
      </Screen>
    );
  }

  if (state.screen === "recovery-intro") {
    return (
      <Screen scroll={false} contentClassName="gap-4 py-4" testID="sb-screen-recovery-intro">
        <Section>
          <Typography type="h4" accessibilityRole="header">Your recovery key</Typography>
          <Typography type="body-sm" color="muted">
            This key unlocks the backup if you need to restore it later.
          </Typography>
        </Section>
        <Section>
          <Typography type="h4">One key. One way back.</Typography>
          <Typography type="body-sm">
            The recovery key is a private code you&apos;ll need to restore your backup.
          </Typography>
          <Typography type="body-sm" className="mt-2">
            Store it somewhere safe, like a password manager.
          </Typography>
          <Typography type="body-sm">
            FreeCBT cannot recover this key for you if it&apos;s lost.
          </Typography>
        </Section>
        <Section>
          <Button testID="sb-view-key" onPress={() => dispatch({ type: "VIEW_KEY" })}>
            View recovery key
          </Button>
        </Section>
      </Screen>
    );
  }

  return null;
}
