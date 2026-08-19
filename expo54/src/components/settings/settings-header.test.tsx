import { render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { SettingsHeader } from "./settings-header";

describe("SettingsHeader", () => {
  it("does not expose a back button for the root Settings destination", () => {
    render(
      <HeroUINativeProvider>
        <SettingsHeader title="Settings" showBack={false} />
      </HeroUINativeProvider>
    );

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });
});
