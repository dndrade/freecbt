import { Routes } from "@/src";
import { HomeScreen } from "@/view/screens/HomeScreen";
import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { renderWithProviders } from "@/tests/support/render";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("navigates to the create-thought route when New Thought is pressed", () => {
  renderWithProviders(<HomeScreen />);

  fireEvent.press(screen.getByTestId("home-new-thought"));

  expect(mockPush).toHaveBeenCalledWith(Routes.thoughtCreateV2());
});

test("renders the New Thought label from translations", () => {
  renderWithProviders(<HomeScreen />);

  expect(screen.getByText("cbt_form.new_thought")).toBeTruthy();
});
