import { MainTabBar } from "@/shared/components/navigation/main-tab-bar";
import { I18nProvider } from "@/src/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import { act, screen } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

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

describe("MainTabBar height reporting", () => {
  it("reports its measured height through the bottom-tab height callback", () => {
    const onHeightChange = jest.fn();

    renderWithProviders(
      <SafeAreaProvider>
        <I18nProvider locale="en">
          <BottomTabBarHeightCallbackContext.Provider value={onHeightChange}>
            <MainTabBar
              state={state as never}
              descriptors={{} as never}
              navigation={navigation as never}
              insets={{ bottom: 0, left: 0, right: 0, top: 0 }}
            />
          </BottomTabBarHeightCallbackContext.Provider>
        </I18nProvider>
      </SafeAreaProvider>
    );

    const region = screen.getByTestId("main-tab-bar");
    act(() => {
      region.props.onLayout?.({
        nativeEvent: { layout: { height: 56, width: 300, x: 0, y: 0 } },
      });
    });

    expect(onHeightChange).toHaveBeenLastCalledWith(68); // 56 + 12 bottom margin
  });

  it("reports height 0 and hides accessibility when the focused route requests it", () => {
    const onHeightChange = jest.fn();
    const descriptors = {
      "home-key": { options: { tabBarStyle: { display: "none" } } },
    };

    renderWithProviders(
      <SafeAreaProvider>
        <I18nProvider locale="en">
          <BottomTabBarHeightCallbackContext.Provider value={onHeightChange}>
            <MainTabBar
              state={state as never}
              descriptors={descriptors as never}
              navigation={navigation as never}
              insets={{ bottom: 0, left: 0, right: 0, top: 0 }}
            />
          </BottomTabBarHeightCallbackContext.Provider>
        </I18nProvider>
      </SafeAreaProvider>
    );

    expect(onHeightChange).toHaveBeenLastCalledWith(0);
    // The pill self-marks accessibilityElementsHidden/importantForAccessibility
    // when hidden, which RNTL's queries exclude by default - opt back in to
    // find it so the hidden-state props themselves can be asserted below.
    const region = screen.getByTestId("main-tab-bar", { includeHiddenElements: true });
    expect(region.props.pointerEvents).toBe("none");
    expect(region.props.accessibilityElementsHidden).toBe(true);
    expect(region.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
