import React from "react";
import * as SecureStore from "expo-secure-store";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { LockSettingsScreen } from "@/features/lock/screens/LockSettingsScreen";
import { useAuthStore } from "@/features/lock/store/useAuthStore";
import { Settings } from "@/model";
import { useFeatureFlagStore } from "@/services";

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

const initialState = useAuthStore.getState();
beforeEach(async () => {
  useAuthStore.setState(initialState, true);
  useFeatureFlagStore.getState().resetFlags();
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

function pressDigits(digits: string) {
  for (const digit of digits) {
    fireEvent.press(screen.getByTestId(`keypad-digit-${digit}`));
  }
}

describe("LockSettingsScreen", () => {
  it("offers setup when no PIN exists", () => {
    renderWithProviders(<LockSettingsScreen />);
    expect(screen.getByText("lock_screen.hub_off_badge")).toBeTruthy();
    expect(screen.getByText("lock_screen.hub_how_it_works_title")).toBeTruthy();
    expect(screen.getByText("lock_screen.hub_off_cta")).toBeTruthy();
  });

  it("opens setup in a drawer", () => {
    renderWithProviders(<LockSettingsScreen />);

    fireEvent.press(screen.getByText("lock_screen.hub_off_cta"));

    expect(screen.getByText("lock_screen.setup_intro_title")).toBeTruthy();
    expect(screen.getByTestId("lock-setup-close")).toBeTruthy();
  });

  it("shows a toast after a four-digit PIN is created", async () => {
    renderWithProviders(<LockSettingsScreen />);

    fireEvent.press(screen.getByText("lock_screen.hub_off_cta"));
    fireEvent.press(screen.getByText("lock_screen.setup_intro_cta"));
    pressDigits("1234");
    pressDigits("1234");

    expect(await screen.findByText("lock_screen.setup_toast")).toBeTruthy();
  });

  it("offers device unlock after setup only when enabled", async () => {
    useFeatureFlagStore
      .getState()
      .overrideFlags({ enable_device_unlock: true });
    renderWithProviders(<LockSettingsScreen />);

    fireEvent.press(screen.getByText("lock_screen.hub_off_cta"));
    fireEvent.press(screen.getByText("lock_screen.setup_intro_cta"));
    pressDigits("1234");
    pressDigits("1234");

    expect(
      await screen.findByText("lock_screen.device_unlock_title"),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole("switch", {
        name: "lock_screen.device_unlock_off",
      }),
    );
    expect(
      screen.getByRole("switch", {
        name: "lock_screen.device_unlock_off",
      }).props.accessibilityState.checked,
    ).toBe(true);
  });

  it("shows management actions when a PIN exists", () => {
    useAuthStore.setState({ hasPin: true });
    renderWithProviders(<LockSettingsScreen />);
    expect(screen.getByText("lock_screen.hub_change_pin")).toBeTruthy();
    expect(screen.getByText("lock_screen.hub_turn_off")).toBeTruthy();
  });

  it("uses icon close controls in management drawers", () => {
    useAuthStore.setState({ hasPin: true });
    renderWithProviders(<LockSettingsScreen />);

    fireEvent.press(screen.getByText("lock_screen.hub_verify_pin"));

    expect(screen.getByTestId("lock-verify-close")).toBeTruthy();
  });

  it("opens change PIN in a drawer", () => {
    useAuthStore.setState({ hasPin: true });
    renderWithProviders(<LockSettingsScreen />);

    fireEvent.press(screen.getByText("lock_screen.hub_change_pin"));

    expect(screen.getByTestId("lock-update-close")).toBeTruthy();
  });
});
