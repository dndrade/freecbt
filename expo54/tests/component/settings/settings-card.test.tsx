import { screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { SettingsCard } from "@/src/features/settings/ui/settings-card";
import { renderWithProviders } from "@/tests/support/render";

describe("SettingsCard", () => {
  it("renders grouped children", () => {
    renderWithProviders(
      <SettingsCard>
        <Text>First</Text>
        <Text>Second</Text>
      </SettingsCard>
    );

    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });
});
