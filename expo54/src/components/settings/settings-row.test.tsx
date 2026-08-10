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

  it("keeps a labeled row and its description in one pressable", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        type="nav"
        iconName="database"
        iconColor="yellow"
        label="Data"
        description="Backup, restore, export"
        onPress={onPress}
      />
    );

    expect(screen.getByText("Backup, restore, export")).toBeTruthy();
    const row = screen.getByRole("button", { name: "Data" });
    expect(row).toBeTruthy();
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders a value row label and trailing value and handles its press", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        type="value"
        iconName="globe"
        iconColor="yellow"
        label="Language"
        value="English"
        onPress={onPress}
      />
    );
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    fireEvent.press(screen.getByText("Language"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a descriptive row as one full-row action", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        type="collapsed"
        iconName="database"
        iconColor="yellow"
        description="Backup, restore, export"
        onPress={onPress}
      />
    );
    expect(screen.getByText("Backup, restore, export")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Backup, restore, export" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
