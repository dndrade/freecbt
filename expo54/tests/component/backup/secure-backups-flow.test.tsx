import { renderHook, act, fireEvent, render, screen as rtlScreen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native";
import {
  init,
  reducer,
  useSecureBackupsFlow,
  SecureBackupsFlowPrototype,
} from "@/src/debug/ui-lab/secure-backups/secure-backups-flow";

function renderFlow(initialMockKey?: string) {
  return render(
    <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
      <SecureBackupsFlowPrototype initialMockKey={initialMockKey} />
    </HeroUINativeProvider>
  );
}

describe("secure backups reducer", () => {
  it("starts inactive with no sheet and a generated key when no override is given", () => {
    const state = init();
    expect(state.screen).toBe("inactive");
    expect(state.sheet).toBe("none");
    expect(state.mockKey).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
    expect(state.backupEnabled).toBe(false);
    expect(state.recoveryKeyGenerated).toBe(false);
    expect(state.recoveryKeyViewed).toBe(false);
    expect(state.recoveryKeySavedIntent).toBe("none");
    expect(state.recoveryKeyConfirmed).toBe(false);
    expect(state.firstBackupStatus).toBe("not_started");
    expect(state.lastBackupAt).toBeNull();
  });

  it("uses the given override instead of generating a key", () => {
    expect(init("FIXED-TEST-KEY-0000").mockKey).toBe("FIXED-TEST-KEY-0000");
  });

  it("walks the manual-save branch to Screen 9 with recoveryKeySavedIntent manual", () => {
    let state = init("ABCD-EFGH-IJKL-MNOP");
    state = reducer(state, { type: "SET_UP" });
    expect(state.screen).toBe("enable");
    state = reducer(state, { type: "ENABLE" });
    expect(state.screen).toBe("recovery-intro");
    state = reducer(state, { type: "VIEW_KEY" });
    expect(state.screen).toBe("save-key");
    expect(state.recoveryKeyGenerated).toBe(true);
    expect(state.recoveryKeyViewed).toBe(false);
    state = reducer(state, { type: "CHOOSE_MANUAL" });
    expect(state.screen).toBe("manual-save");
    expect(state.recoveryKeyViewed).toBe(true);
    state = reducer(state, { type: "MANUAL_NEXT" });
    expect(state.screen).toBe("confirm");
    expect(state.recoveryKeySavedIntent).toBe("manual");
    state = reducer(state, { type: "CONFIRM_INPUT_CHANGED", value: "wrong" });
    state = reducer(state, { type: "CONFIRM_NEXT" });
    expect(state.recoveryKeyConfirmed).toBe(false);
    expect(state.sheet).toBe("none");
    state = reducer(state, { type: "CONFIRM_INPUT_CHANGED", value: "ABCD-EFGH-IJKL-MNOP" });
    state = reducer(state, { type: "CONFIRM_NEXT" });
    expect(state.recoveryKeyConfirmed).toBe(true);
    expect(state.sheet).toBe("final-notice");
    state = reducer(state, { type: "FINAL_NOTICE_CONTINUE" });
    expect(state.screen).toBe("active");
    expect(state.sheet).toBe("none");
    expect(state.backupEnabled).toBe(true);
    expect(state.firstBackupStatus).toBe("starting");
    expect(state.lastBackupAt).toBeNull();
  });

  it("walks the password-manager branch without ever setting recoveryKeyViewed", () => {
    let state = init("ABCD-EFGH-IJKL-MNOP");
    state = reducer(state, { type: "SET_UP" });
    state = reducer(state, { type: "ENABLE" });
    state = reducer(state, { type: "VIEW_KEY" });
    state = reducer(state, { type: "CHOOSE_PASSWORD_MANAGER" });
    expect(state.sheet).toBe("password-manager");
    state = reducer(state, { type: "PASSWORD_MANAGER_CONTINUE" });
    expect(state.sheet).toBe("none");
    expect(state.screen).toBe("confirm");
    expect(state.recoveryKeySavedIntent).toBe("password_manager");
    expect(state.recoveryKeyViewed).toBe(false);
    state = reducer(state, { type: "PASTE_FROM_PASSWORD_MANAGER" });
    expect(state.confirmInput).toBe("ABCD-EFGH-IJKL-MNOP");
    state = reducer(state, { type: "CONFIRM_NEXT" });
    expect(state.recoveryKeyConfirmed).toBe(true);
  });

  it("cancelling the password-manager sheet returns to save-key unchanged", () => {
    let state = init();
    state = { ...state, screen: "save-key" };
    state = reducer(state, { type: "CHOOSE_PASSWORD_MANAGER" });
    state = reducer(state, { type: "PASSWORD_MANAGER_CANCEL" });
    expect(state.sheet).toBe("none");
    expect(state.screen).toBe("save-key");
    expect(state.recoveryKeySavedIntent).toBe("none");
  });

  it("dismissing each sheet ambiently has sheet-specific effects", () => {
    let state = init();
    state = { ...state, screen: "save-key", sheet: "password-manager" };
    expect(reducer(state, { type: "SHEET_DISMISSED" })).toMatchObject({
      sheet: "none",
      screen: "save-key",
    });

    state = { ...state, screen: "enable", sheet: "learn-more" };
    expect(reducer(state, { type: "SHEET_DISMISSED" })).toMatchObject({
      sheet: "none",
      screen: "enable",
    });

    state = { ...state, screen: "confirm", sheet: "final-notice" };
    expect(reducer(state, { type: "SHEET_DISMISSED" })).toMatchObject({
      sheet: "none",
      screen: "manual-save",
      backupEnabled: false,
    });
  });

  it("SEE_KEY_AGAIN returns to manual-save from the confirm screen or the final-notice sheet", () => {
    let state = init();
    state = { ...state, screen: "confirm", sheet: "none" };
    expect(reducer(state, { type: "SEE_KEY_AGAIN" })).toMatchObject({
      screen: "manual-save",
      sheet: "none",
    });

    state = { ...state, screen: "confirm", sheet: "final-notice" };
    expect(reducer(state, { type: "SEE_KEY_AGAIN" })).toMatchObject({
      screen: "manual-save",
      sheet: "none",
    });
  });

  it("RESET returns to defaults while keeping the same mock key", () => {
    let state = init("ABCD-EFGH-IJKL-MNOP");
    state = reducer(state, { type: "SET_UP" });
    state = reducer(state, { type: "RESET" });
    expect(state.screen).toBe("inactive");
    expect(state.mockKey).toBe("ABCD-EFGH-IJKL-MNOP");
  });

  it("useSecureBackupsFlow threads its initialMockKey into init", () => {
    const { result } = renderHook(() => useSecureBackupsFlow("SEED-SEED-SEED-SEED"));
    expect(result.current[0].mockKey).toBe("SEED-SEED-SEED-SEED");

    act(() => {
      result.current[1]({ type: "SET_UP" });
    });
    expect(result.current[0].screen).toBe("enable");
  });
});

describe("secure backups flow UI: screens 1-3", () => {
  it("starts on Screen 1 with a single set-up CTA", () => {
    renderFlow();
    expect(rtlScreen.getByTestId("sb-screen-inactive")).toBeTruthy();
    expect(rtlScreen.getByText("Not set up")).toBeTruthy();
    fireEvent.press(rtlScreen.getByTestId("sb-set-up"));
    expect(rtlScreen.getByTestId("sb-screen-enable")).toBeTruthy();
  });

  it("Learn more opens and closes without changing the screen", () => {
    renderFlow();
    fireEvent.press(rtlScreen.getByTestId("sb-set-up"));
    fireEvent.press(rtlScreen.getByTestId("sb-learn-more"));
    expect(rtlScreen.getByTestId("sb-sheet-learn-more")).toBeTruthy();
    fireEvent.press(rtlScreen.getByTestId("sb-learn-more-close"));
    expect(rtlScreen.queryByTestId("sb-sheet-learn-more")).toBeNull();
    expect(rtlScreen.getByTestId("sb-screen-enable")).toBeTruthy();
  });

  it("Enable moves to Screen 3, recovery key intro", () => {
    renderFlow();
    fireEvent.press(rtlScreen.getByTestId("sb-set-up"));
    fireEvent.press(rtlScreen.getByTestId("sb-enable"));
    expect(rtlScreen.getByTestId("sb-screen-recovery-intro")).toBeTruthy();
  });
});
