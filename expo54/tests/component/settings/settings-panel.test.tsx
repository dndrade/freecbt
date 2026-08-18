import { fireEvent, screen, within } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SettingsPanel, type SettingsPanelItem } from "@/src/features/settings/ui/settings-panel";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("@/src/features/settings/ui/settings-sheet", () => {
  return {
    SettingsSheet: ({
      isOpen,
      title,
      children,
      onClosed,
    }: {
      isOpen: boolean;
      title: string;
      children: React.ReactNode;
      onClosed?: () => void;
    }) =>
      isOpen ? (
        <View testID="settings-sheet">
          <Text>{title}</Text>
          {children}
          <Pressable testID="sheet-close" onPress={onClosed}>
            <Text>close</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

const items = [
  {
    id: "toggle",
    type: "toggle",
    iconName: "bell",
    label: "Reminders",
    isSelected: false,
    onSelectedChange: jest.fn(),
  },
  {
    id: "navigate",
    type: "nav",
    iconName: "lock",
    label: "App Lock",
    onPress: jest.fn(),
  },
  {
    id: "value",
    type: "value",
    iconName: "globe",
    label: "Language",
    value: "English",
    onPress: jest.fn(),
  },
] as const;

describe("SettingsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the shared sheet title and mixed row types", () => {
    renderWithProviders(
      <SettingsPanel isOpen onOpenChange={jest.fn()} title="General" items={items} />
    );

    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Reminders" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "App Lock" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Language, English" })).toBeTruthy();
  });

  it("forwards toggle and value row presses", () => {
    renderWithProviders(
      <SettingsPanel isOpen onOpenChange={jest.fn()} title="General" items={items} />
    );

    fireEvent.press(screen.getByRole("switch", { name: "Reminders" }));
    expect(items[0].onSelectedChange).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
    expect(items[2].onPress).toHaveBeenCalledTimes(1);
  });

  it("forwards ordinary row presses when obsolete navigation data is present", () => {
    const onPress = jest.fn();
    const item = {
      id: "lock",
      type: "nav",
      iconName: "lock",
      label: "App Lock",
      navigateTo: "/v2/settings/lock",
      onPress,
    } as unknown as SettingsPanelItem;

    renderWithProviders(
      <SettingsPanel isOpen onOpenChange={jest.fn()} title="General" items={[item]} />
    );

    fireEvent.press(screen.getByRole("button", { name: "App Lock" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("forwards sheet closure", () => {
    const onClosed = jest.fn();

    renderWithProviders(
      <SettingsPanel isOpen onOpenChange={jest.fn()} title="General" items={items} onClosed={onClosed} />
    );

    fireEvent.press(screen.getByTestId("sheet-close"));
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("renders optional footer content inside the sheet after the card", () => {
    renderWithProviders(
      <SettingsPanel
        isOpen
        onOpenChange={jest.fn()}
        title="General"
        items={items}
        footer={<Text>Panel footer</Text>}
      />
    );

    expect(within(screen.getByTestId("settings-sheet")).getByText("Panel footer")).toBeTruthy();
  });
});
