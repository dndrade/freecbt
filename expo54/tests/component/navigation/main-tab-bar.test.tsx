import { MainTabBar } from "@/src/components/navigation/main-tab-bar";
import { I18nProvider } from "@/src/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { screen } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const navigation = {
  emit: jest.fn(() => ({ defaultPrevented: false })),
  navigate: jest.fn(),
};

const state = {
  index: 1,
  routes: [
    { key: "thoughts-key", name: "thoughts" },
    { key: "home-key", name: "index" },
    { key: "settings-key", name: "settings/index" },
  ],
};

describe("MainTabBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Journal as a first-class tab from navigator state", () => {
    renderWithProviders(
      <SafeAreaProvider>
        <I18nProvider locale="en">
          <MainTabBar
            state={state as never}
            descriptors={{} as never}
            navigation={navigation as never}
            insets={{ bottom: 0, left: 0, right: 0, top: 0 }}
          />
        </I18nProvider>
      </SafeAreaProvider>
    );

    expect(screen.getByRole("tab", { name: "Journal" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Home", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "settings" })).toBeTruthy();
  });
});
