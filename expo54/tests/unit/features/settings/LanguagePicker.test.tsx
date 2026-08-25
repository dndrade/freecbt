const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { I18nProvider } from "@/i18n/use-i18n";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LanguagePicker } from "@/features/settings/components/LanguagePicker";

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

test("selecting a language updates useSettings without requiring the legacy Model provider", () => {
  const onDismiss = jest.fn();
  renderWithProviders(
    <I18nProvider locale="en">
      <LanguagePicker onDismiss={onDismiss} />
    </I18nProvider>,
  );

  fireEvent.press(screen.getByText(/ES —/));

  expect(useSettings.getState().settings.locale).toBe("es");
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
