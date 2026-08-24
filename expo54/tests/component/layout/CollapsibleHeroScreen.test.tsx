import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { renderWithProviders } from "@/tests/support/render";
import { CollapsibleHeroScreen } from "@/shared/components/Layout/CollapsibleHeroScreen";
import { backHeaderAction } from "@/shared/components/Layout/Base/HeaderActionButton";

describe("CollapsibleHeroScreen", () => {
  it("renders the title, left action, and children", () => {
    const onBack = jest.fn();
    renderWithProviders(
      <CollapsibleHeroScreen
        title="Mount Fuji"
        heroContent={<View testID="hero" />}
        leftAction={backHeaderAction(onBack)}
      >
        <View testID="body" />
      </CollapsibleHeroScreen>,
    );
    expect(screen.getByTestId("hero")).toBeTruthy();
    expect(screen.getByTestId("body")).toBeTruthy();
    expect(screen.getAllByText("Mount Fuji").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("uses the legacy back hint for a custom left action without one", () => {
    renderWithProviders(
      <CollapsibleHeroScreen
        heroContent={<View />}
        leftAction={{
          icon: "chevron-left",
          accessibilityLabel: "Go back",
          onPress: jest.fn(),
        }}
      >
        <View />
      </CollapsibleHeroScreen>,
    );
    expect(screen.getByLabelText("Go back").props.accessibilityHint).toBe(
      "Navigates to previous screen",
    );
  });

  it("renders an OverflowMenuTrigger when overflowItems is set and rightAction is not", () => {
    renderWithProviders(
      <CollapsibleHeroScreen
        heroContent={<View />}
        overflowItems={[{ label: "Share", onPress: jest.fn() }]}
      >
        <View />
      </CollapsibleHeroScreen>,
    );
    expect(screen.getByLabelText("More options")).toBeTruthy();
  });

  it("prefers rightAction over overflowItems when both are set", () => {
    renderWithProviders(
      <CollapsibleHeroScreen
        heroContent={<View />}
        rightAction={{
          icon: "settings",
          accessibilityLabel: "Settings",
          onPress: jest.fn(),
        }}
        overflowItems={[{ label: "Share", onPress: jest.fn() }]}
      >
        <View />
      </CollapsibleHeroScreen>,
    );
    expect(screen.getByLabelText("Settings")).toBeTruthy();
    expect(screen.queryByLabelText("More options")).toBeNull();
  });
});
