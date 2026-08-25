import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { LockSettingsScreen } from "@/features/lock/screens/LockSettingsScreen";
import { useAuthStore } from "@/features/lock/store/useAuthStore";

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const initialState = useAuthStore.getState();
beforeEach(() => useAuthStore.setState(initialState, true));

describe("LockSettingsScreen", () => {
  it("offers setup when no PIN exists", () => {
    renderWithProviders(<LockSettingsScreen />);
    expect(screen.getByText("lock_screen.hub_off_cta")).toBeTruthy();
  });

  it("shows management actions when a PIN exists", () => {
    useAuthStore.setState({ hasPin: true });
    renderWithProviders(<LockSettingsScreen />);
    expect(screen.getByText("lock_screen.hub_change_pin")).toBeTruthy();
    expect(screen.getByText("lock_screen.hub_turn_off")).toBeTruthy();
  });
});
