import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { SettingsRow } from "@/src/features/settings/ui/settings-row";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("@expo/vector-icons", () => ({
  Feather: ({ name }: { name: string }) => <Text>{name}</Text>,
}));

jest.mock("@/src/features/settings/ui/icon-tile", () => ({
  IconTile: ({ children }: { children: (iconColor: string) => React.ReactNode }) =>
    children("icon-color"),
}));

const renderRow = renderWithProviders;

describe("SettingsRow", () => {
  it("fires onSelectedChange when a toggle row's switch flips", () => {
    const onSelectedChange = jest.fn();
    renderRow(
      <SettingsRow
        type="toggle"
        iconName="bell"
        label="Notifications"
        isSelected={false}
        onSelectedChange={onSelectedChange}
      />
    );
    fireEvent.press(screen.getByRole("switch", { name: "Notifications" }));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(screen.getAllByRole("switch")).toHaveLength(1);
  });

  it("fires onPress when a nav row is pressed", () => {
    const onPress = jest.fn();
    renderRow(
      <SettingsRow type="nav" iconName="lock" label="App Lock" onPress={onPress} />
    );
    fireEvent.press(screen.getByRole("button", { name: "App Lock" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a labeled row and its description in one pressable", () => {
    const onPress = jest.fn();
    renderRow(
      <SettingsRow
        type="nav"
        iconName="database"
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
    renderRow(
      <SettingsRow
        type="value"
        iconName="globe"
        label="Language"
        value="English"
        onPress={onPress}
      />
    );
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a descriptive row as one full-row action", () => {
    const onPress = jest.fn();
    renderRow(
      <SettingsRow
        type="collapsed"
        iconName="database"
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
