import Create from "@/app/v2/(public)/thoughts/create";
import Edit from "@/app/v2/(public)/thoughts/[idOrKey]/edit";
import Home from "@/app/v2/(public)/(tabs)/index";
import List from "@/app/v2/(public)/(tabs)/thoughts";
import ThoughtsLayoutRoute from "@/app/v2/(public)/(tabs)/thoughts/_layout";
import View from "@/app/v2/(public)/(tabs)/thoughts/[idOrKey]";
import { ThoughtCreateScreen } from "@/features/thoughtRecord/screens/ThoughtCreateScreen";
import { ThoughtEditScreen } from "@/features/thoughtRecord/screens/ThoughtEditScreen";
import { ThoughtHomeComposerScreen } from "@/features/thoughtRecord/screens/ThoughtHomeComposerScreen";
import { ThoughtViewScreen } from "@/features/thoughtRecord/screens/ThoughtViewScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { I18nProvider } from "@/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

jest.mock("@/features/thoughtRecord/screens/ThoughtCreateScreen", () => ({
  ThoughtCreateScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtEditScreen", () => ({
  ThoughtEditScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtHomeComposerScreen", () => ({
  ThoughtHomeComposerScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtViewScreen", () => ({
  ThoughtViewScreen: jest.fn(() => null),
}));
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => null,
  useFocusEffect: (effect: () => void | (() => void)) =>
    React.useEffect(effect, []),
  useLocalSearchParams: () => ({}),
}));
const readAll = jest.fn();
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ readAll })),
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;

beforeEach(() => {
  jest.clearAllMocks();
  readAll.mockReset();
});

test.each([
  ["create", Create, ThoughtCreateScreen],
  ["edit", Edit, ThoughtEditScreen],
  ["home", Home, ThoughtHomeComposerScreen],
  ["view", View, ThoughtViewScreen],
])("wires the %s route to its screen", (_name, Route, Screen) => {
  render(<Route />);

  expect(jest.mocked(Screen)).toHaveBeenCalledTimes(1);
});

test("defers the journal route to its layout-owned list", () => {
  render(<List />);

  expect(screen.toJSON()).toBeNull();
});

test("mounts the journal layout route with its list dependency graph", async () => {
  ready.mockResolvedValue({} as never);
  readAll.mockResolvedValueOnce([]);
  renderWithProviders(
    <I18nProvider locale="en">
      <ThoughtsLayoutRoute />
    </I18nProvider>,
  );

  await waitFor(() =>
    expect(screen.getByText("No thoughts yet!")).toBeTruthy(),
  );
});
