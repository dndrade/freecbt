import { Routes } from "@/src";
import { HomeScreen } from "@/view/screens/HomeScreen";
import { OverflowMenuTrigger } from "@/shared/components/OverflowMenu";
import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { renderWithProviders } from "@/tests/support/render";

const mockPush = jest.fn();
const setOptions = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions }),
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

test("navigates to Settings when the overflow menu's Settings item is pressed", () => {
  renderWithProviders(<HomeScreen />);

  const headerRight = setOptions.mock.calls.at(-1)?.[0]?.headerRight;
  renderWithProviders(headerRight());

  const settingsItem = screen
    .UNSAFE_getByType(OverflowMenuTrigger)
    .props.items.find(
      (item: { label: string }) => item.label === "settings.header",
    );

  expect(settingsItem).toBeDefined();
  settingsItem.onPress();

  expect(mockPush).toHaveBeenCalledWith(Routes.settingsV2());
});
