const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { I18nProvider } from "@/i18n/use-i18n";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { SettingsScreen } from "@/features/settings/screens/SettingsScreen";

beforeEach(() => {
  values.clear();
  useSettings.setState({
    settings: {
      locale: null,
      reminders: false,
      existingUser: false,
      theme: null,
    },
  });
});

test("renders without the legacy Model provider, using the real translation dictionary", () => {
  renderWithProviders(
    <I18nProvider locale="en">
      <SettingsScreen />
    </I18nProvider>,
  );

  expect(screen.getByText("Language")).toBeTruthy();
  expect(screen.getByText("Notifications")).toBeTruthy();
});
