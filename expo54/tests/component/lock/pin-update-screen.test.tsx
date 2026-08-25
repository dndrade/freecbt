import React from "react";
import * as SecureStore from "expo-secure-store";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { UpdatePinSheet } from "@/features/lock/components/UpdatePinSheet";
import { useAuthStore } from "@/features/lock/store/useAuthStore";
import { Settings } from "@/model";

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const initialState = useAuthStore.getState();

beforeEach(async () => {
  useAuthStore.setState(initialState, true);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
  await useAuthStore.getState().setPin("1111");
});

function pressDigits(digits: string) {
  for (const digit of digits) {
    fireEvent.press(screen.getByTestId(`keypad-digit-${digit}`));
  }
}

describe("UpdatePinSheet", () => {
  it("blocks advancement on an incorrect current PIN", async () => {
    renderWithProviders(
      <UpdatePinSheet isOpen onOpenChange={jest.fn()} onComplete={jest.fn()} />,
    );

    pressDigits("0000");

    await screen.findByText("lock_screen.update_wrong_current");
  });

  it("stores a new PIN after current, new, and confirm steps", async () => {
    const onComplete = jest.fn();
    renderWithProviders(
      <UpdatePinSheet
        isOpen
        onOpenChange={jest.fn()}
        onComplete={onComplete}
      />,
    );

    pressDigits("1111");
    await act(async () => {});
    pressDigits("2222");
    await act(async () => {});
    pressDigits("2222");

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(await useAuthStore.getState().verifyPin("2222")).toBe(true);
  });
});
