const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { defaultLocale, useI18n } from "@/i18n/use-i18n";
import { ModelI18nProvider } from "@/src/view/gateways/app-provider";

function LocaleProbe() {
  const i18n = useI18n();
  return <Text testID="locale">{i18n.locale}</Text>;
}

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

test("ModelI18nProvider derives the active locale from useSettings, not the legacy Model", () => {
  useSettings.setState({
    settings: {
      locale: "es",
      reminders: false,
      existingUser: false,
      theme: null,
    },
  });

  render(
    <ModelI18nProvider>
      <LocaleProbe />
    </ModelI18nProvider>,
  );

  expect(screen.getByTestId("locale").props.children).toBe("es");
});

test("ModelI18nProvider falls back to the device default when no locale is persisted", () => {
  render(
    <ModelI18nProvider>
      <LocaleProbe />
    </ModelI18nProvider>,
  );

  expect(screen.getByTestId("locale").props.children).toBe(defaultLocale());
});
