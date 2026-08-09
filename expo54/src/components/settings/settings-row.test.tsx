import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { SettingsRow } from "./settings-row";

describe("SettingsRow", () => {
  it("fires onSelectedChange when a toggle row's switch flips", () => {
    const onSelectedChange = jest.fn();
    render(
      <HeroUINativeProvider>
        <SettingsRow
          type="toggle"
          iconName="bell"
          iconColor="pink"
          label="Notifications"
          isSelected={false}
          onSelectedChange={onSelectedChange}
        />
      </HeroUINativeProvider>
    );
    fireEvent(screen.getByRole("switch"), "onSelectedChange", true);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it("fires onPress when a nav row is pressed", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        type="nav"
        iconName="lock"
        iconColor="purple"
        label="App Lock"
        onPress={onPress}
      />
    );
    fireEvent.press(screen.getByText("App Lock"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the value text and chevron for a value row", () => {
    render(
      <SettingsRow
        type="value"
        iconName="globe"
        iconColor="yellow"
        label="Language"
        value="English"
      />
    );
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("renders only description text for a collapsed row", () => {
    render(
      <SettingsRow
        type="collapsed"
        iconName="database"
        iconColor="yellow"
        description="Backup, restore, export"
      />
    );
    expect(screen.getByText("Backup, restore, export")).toBeTruthy();
  });
});
