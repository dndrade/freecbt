import React from "react";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AuthGateway } from "@/features/lock/auth-gateway";
import { Settings } from "@/model";
import { useAuthStore } from "@/features/lock/store/useAuthStore";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const initialState = useAuthStore.getState();

beforeEach(async () => {
  useAuthStore.setState(initialState, true);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

function pressDigits(digits: string) {
  for (const digit of digits)
    fireEvent.press(screen.getByTestId(`keypad-digit-${digit}`));
}

describe("AuthGateway", () => {
  it("renders children when no PIN is configured", async () => {
    renderWithProviders(
      <AuthGateway>
        <Text>protected content</Text>
      </AuthGateway>,
    );
    expect(await screen.findByText("protected content")).toBeTruthy();
  });

  it("unlocks after the configured PIN is entered", async () => {
    await SecureStore.setItemAsync(Settings.pincodeSecureKey, "1234");
    renderWithProviders(
      <AuthGateway>
        <Text>protected content</Text>
      </AuthGateway>,
    );
    await screen.findByText("lock_screen.gate_title");
    pressDigits("1234");
    expect(await screen.findByText("protected content")).toBeTruthy();
  });

  it("keeps content hidden after an incorrect PIN", async () => {
    await SecureStore.setItemAsync(Settings.pincodeSecureKey, "1234");
    renderWithProviders(
      <AuthGateway>
        <Text>protected content</Text>
      </AuthGateway>,
    );
    await screen.findByText("lock_screen.gate_title");
    pressDigits("0000");
    await waitFor(() =>
      expect(screen.getByText("lock_screen.wrong_pin")).toBeTruthy(),
    );
    expect(screen.queryByText("protected content")).toBeNull();
  });
});
