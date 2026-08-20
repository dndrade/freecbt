import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { Screen } from "@/src/components/layout/screen";
import { renderWithProviders } from "@/tests/support/render";

describe("Screen", () => {
  it("renders without a footer by default", () => {
    renderWithProviders(
      <Screen>
        <Text>Body</Text>
      </Screen>
    );

    expect(screen.getByText("Body")).toBeTruthy();
    expect(screen.queryByText("Footer")).toBeNull();
  });

  it("renders footer content pinned outside the scrollable body", () => {
    renderWithProviders(
      <Screen footer={<Text>Footer</Text>}>
        <Text>Body</Text>
      </Screen>
    );

    expect(screen.getByText("Body")).toBeTruthy();
    expect(screen.getByText("Footer")).toBeTruthy();
  });
});

describe("Screen tab-bar clearance", () => {
  it("adds no extra bottom padding outside a bottom-tab navigator", () => {
    renderWithProviders(
      <Screen footer={<Text>Footer</Text>}>
        <Text>Body</Text>
      </Screen>
    );

    const footer = screen.getByText("Footer").parent?.parent;
    expect(footer?.props.style.paddingBottom).toBe(24);
  });

  it("adds the reported tab-bar height to footer clearance", () => {
    renderWithProviders(
      <BottomTabBarHeightContext.Provider value={80}>
        <Screen footer={<Text>Footer</Text>}>
          <Text>Body</Text>
        </Screen>
      </BottomTabBarHeightContext.Provider>
    );

    const footer = screen.getByText("Footer").parent?.parent;
    expect(footer?.props.style.paddingBottom).toBe(24 + 80);
  });
});
