import React from "react";
import * as SecureStore from "expo-secure-store";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { PinSetupScreen } from "@/features/lock/screens/PinSetupScreen";
import { useAuthStore } from "@/features/lock/store/useAuthStore";
import * as pinStorage from "@/features/lock/services/pinStorage";
import { Settings } from "@/model";

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const replace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

const initialState = useAuthStore.getState();

beforeEach(async () => {
  useAuthStore.setState(initialState, true);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
  replace.mockClear();
});

afterEach(() => jest.restoreAllMocks());

function pressDigits(digits: string) {
  for (const digit of digits) {
    fireEvent.press(screen.getByTestId(`keypad-digit-${digit}`));
  }
}

describe("PinSetupScreen", () => {
  it("walks intro to confirmation and stores a matching PIN", async () => {
    renderWithProviders(<PinSetupScreen />);

    fireEvent.press(screen.getByText("lock_screen.setup_intro_cta"));
    pressDigits("1234");
    pressDigits("1234");

    await screen.findByText("lock_screen.setup_success_title");
    expect(useAuthStore.getState().hasPin).toBe(true);
  });

  it("shows an error without storing a mismatched PIN", async () => {
    renderWithProviders(<PinSetupScreen />);

    fireEvent.press(screen.getByText("lock_screen.setup_intro_cta"));
    pressDigits("1234");
    pressDigits("0000");

    await screen.findByText("lock_screen.setup_mismatch");
    expect(useAuthStore.getState().hasPin).toBe(false);

    pressDigits("5678");
    pressDigits("5678");
    await screen.findByText("lock_screen.setup_success_title");
  });

  it("shows a save error without enabling the lock", async () => {
    renderWithProviders(<PinSetupScreen />);

    fireEvent.press(screen.getByText("lock_screen.setup_intro_cta"));
    pressDigits("1234");
    jest
      .spyOn(pinStorage, "setPin")
      .mockRejectedValueOnce(new Error("unavailable"));
    pressDigits("1234");

    await screen.findByText("lock_screen.setup_storage_error");
    expect(useAuthStore.getState().hasPin).toBe(false);
  });
});
