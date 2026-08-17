import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SettingsScreen } from "./settings-screen";

const translate = ((key: string) => key) as any;
const model = { settings: {} } as any;
const dispatch = jest.fn();

function mockPanel(name: string) {
  return function Panel({
    isOpen,
    onOpenChange,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    return isOpen ? (
      <View>
        <Text testID={`${name}-panel`}>{name}</Text>
        <Pressable testID={`${name}-close`} onPress={() => onOpenChange(false)}>
          <Text>close</Text>
        </Pressable>
      </View>
    ) : null;
  };
}

jest.mock("@/src/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  ScreenHeader: ({ title }: { title: string }) => <Text>{title}</Text>,
}));

jest.mock("./ui/settings-card", () => ({
  SettingsCard: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
}));

jest.mock("./ui/settings-row", () => ({
  SettingsRow: ({
    label,
    description,
    onPress,
  }: {
    label: string;
    description?: string;
    onPress: () => void;
  }) => (
    <Pressable testID="hub-row" accessibilityLabel={label} onPress={onPress}>
      <Text>{label}</Text>
      {description ? <Text>{description}</Text> : null}
    </Pressable>
  ),
}));

jest.mock("./ui/general-sheet", () => ({ GeneralSheet: mockPanel("general") }));
jest.mock("./ui/appearance-picker", () => ({ AppearancePicker: mockPanel("appearance") }));
jest.mock("./ui/journal-picker", () => ({ JournalPicker: mockPanel("journal") }));
jest.mock("./ui/data-sheet", () => ({ DataSheet: mockPanel("data") }));
jest.mock("./ui/wellbeing-sheet", () => ({ WellbeingSheet: mockPanel("wellbeing") }));
jest.mock("./ui/support-sheet", () => ({ SupportSheet: mockPanel("support") }));
jest.mock("./ui/about-sheet", () => ({ AboutSheet: mockPanel("about") }));

function renderScreen() {
  return render(<SettingsScreen model={model} dispatch={dispatch} translate={translate} style={{} as any} />);
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it("renders the hub rows in order", () => {
    renderScreen();

    expect(screen.getAllByTestId("hub-row").map((row) => row.props.accessibilityLabel)).toEqual([
      "settings.hub.general.label",
      "settings.hub.appearance.label",
      "settings.hub.journal.label",
      "settings.hub.data.label",
      "settings.hub.wellbeing.label",
      "settings.hub.support.label",
      "settings.hub.about.label",
    ]);
  });

  it("opens one panel at a time and closes it through onOpenChange", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.general.label"));
    expect(screen.getByTestId("general-panel")).toBeTruthy();
    expect(screen.queryByTestId("appearance-panel")).toBeNull();

    fireEvent.press(screen.getByText("settings.hub.appearance.label"));
    expect(screen.queryByTestId("general-panel")).toBeNull();
    expect(screen.getByTestId("appearance-panel")).toBeTruthy();

    fireEvent.press(screen.getByTestId("appearance-close"));
    expect(screen.queryByTestId("appearance-panel")).toBeNull();
  });
});
