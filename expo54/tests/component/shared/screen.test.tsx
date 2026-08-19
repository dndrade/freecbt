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
