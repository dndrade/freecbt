import React from "react";
import { render } from "@testing-library/react-native";
import { Stack } from "expo-router";
import SettingsLayout from "@/app/v2/(public)/settings/_layout";
import SettingsRoute from "@/app/v2/(public)/settings/index";
import { useScreenHeader } from "@/shared/components";

let mockStackProps: Record<string, unknown> | undefined;

jest.mock("expo-router", () => {
  const Stack = (props: Record<string, unknown>) => {
    mockStackProps = props;
    return null;
  };

  return { Stack };
});

jest.mock("heroui-native", () => ({
  Typography: { Heading: () => null },
  useThemeColor: (token: string) => token,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

jest.mock("@/shared/components", () => ({
  StandardScreen: ({ children }: { children: React.ReactNode }) => children,
  HeaderActionButton: () => null,
  useScreenHeader: jest.fn(),
}));

jest.mock("@/features/settings/components/SettingRow", () => ({
  SettingRow: () => null,
}));

jest.mock("@/features/settings/components/LanguagePicker", () => ({
  LanguagePicker: () => null,
}));

jest.mock("@/features/settings/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: { reminders: false, locale: "en" },
    initialize: jest.fn(),
    setReminders: jest.fn(),
  }),
}));

describe("Settings route native header", () => {
  beforeEach(() => {
    mockStackProps = undefined;
    jest.clearAllMocks();
  });

  it("enables the themed native header that receives the Settings title", () => {
    render(<SettingsLayout />);
    render(<SettingsRoute />);

    expect(mockStackProps?.screenOptions).toEqual(
      expect.objectContaining({
        headerStyle: { backgroundColor: "background" },
        headerTintColor: "foreground",
        headerTitleStyle: { color: "foreground", fontWeight: "600" },
        headerShadowVisible: false,
      }),
    );
    expect(mockStackProps?.screenOptions).not.toEqual(
      expect.objectContaining({ headerShown: false }),
    );
    expect(useScreenHeader).toHaveBeenCalledWith({ title: "Settings" });
  });
});
