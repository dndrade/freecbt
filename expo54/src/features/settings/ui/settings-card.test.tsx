import { render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { Text } from "react-native";
import { SettingsCard } from "./settings-card";

describe("SettingsCard", () => {
  it("renders grouped children", () => {
    render(
      <HeroUINativeProvider>
        <SettingsCard>
          <Text>First</Text>
          <Text>Second</Text>
        </SettingsCard>
      </HeroUINativeProvider>
    );

    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
  });
});
