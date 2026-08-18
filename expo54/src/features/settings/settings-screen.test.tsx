import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { existsSync } from "fs";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SettingsScreen } from "./settings-screen";

const translate = ((key: string) => key) as any;
const model = { settings: {} } as any;
const dispatch = jest.fn();
const reminders = { set: jest.fn() };

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

jest.mock("@/src/features/reminders/use-reminders", () => ({
  useReminders: () => reminders,
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "2.5.0-rc.1" } },
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("heroui-native", () => ({
  Typography: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
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

jest.mock("./ui/appearance-picker", () => ({ AppearancePicker: mockPanel("appearance") }));
jest.mock("./ui/journal-picker", () => ({ JournalPicker: mockPanel("journal") }));
jest.mock("./ui/language-picker", () => ({
  LanguagePicker: ({
    isOpen,
    onOpenChange,
    onBack,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onBack: () => void;
  }) =>
    isOpen ? (
      <View>
        <Text>settings.locale.contribute</Text>
        <Pressable accessibilityLabel="settings.general.header" onPress={onBack}>
          <Text>back</Text>
        </Pressable>
        <Pressable testID="language-close" onPress={() => onOpenChange(false)}>
          <Text>close</Text>
        </Pressable>
      </View>
    ) : null,
}));
jest.mock("./ui/settings-panel", () => ({
  SettingsPanel: ({
    title,
    isOpen,
    onOpenChange,
    items,
    onClosed,
    footer,
  }: {
    title: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    items: readonly {
      id: string;
      label?: string;
      description?: string;
      onPress?: () => void;
    }[];
    onClosed?: () => void;
    footer?: React.ReactNode;
  }) =>
    (
      <View>
        {isOpen ? (
          <View testID={`${title}-sheet`}>
            <Text testID={`${title}-panel`}>{title}</Text>
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityLabel={item.label ?? item.description}
                onPress={item.onPress}
              >
                <Text>{item.label ?? item.description}</Text>
              </Pressable>
            ))}
            {footer}
            <Pressable testID={`${title}-close`} onPress={() => onOpenChange(false)}>
              <Text>close</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable testID={`${title}-closed`} onPress={onClosed}>
          <Text>closed</Text>
        </Pressable>
      </View>
    ),
}));

function renderScreen(translateFn = translate) {
  return render(<SettingsScreen model={model} dispatch={dispatch} translate={translateFn} style={{} as any} />);
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
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

  it("does not retain obsolete category sheet boundaries", () => {
    for (const name of ["general-sheet.tsx", "wellbeing-sheet.tsx", "about-sheet.tsx"]) {
      expect(existsSync(`${__dirname}/ui/${name}`)).toBe(false);
    }
  });

  it("opens one panel at a time and closes it through onOpenChange", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.general.label"));
    expect(screen.getByTestId("settings.general.header-panel")).toBeTruthy();
    expect(screen.queryByTestId("appearance-panel")).toBeNull();

    fireEvent.press(screen.getByText("settings.hub.appearance.label"));
    expect(screen.queryByTestId("settings.general.header-panel")).toBeNull();
    expect(screen.getByTestId("appearance-panel")).toBeTruthy();

    fireEvent.press(screen.getByTestId("appearance-close"));
    expect(screen.queryByTestId("appearance-panel")).toBeNull();
  });

  it("opens declarative SettingsPanel categories directly", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.data.label"));
    expect(screen.getByTestId("settings.data.header-panel")).toBeTruthy();

    fireEvent.press(screen.getByTestId("settings.data.header-close"));
    expect(screen.queryByTestId("settings.data.header-panel")).toBeNull();

    fireEvent.press(screen.getByText("settings.hub.support.label"));
    expect(screen.getByTestId("settings.support.header-panel")).toBeTruthy();
  });

  it("resets General from language to root after dismissal", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.general.label"));
    fireEvent.press(screen.getByText("settings.general.language.label"));
    expect(screen.getByText("settings.locale.contribute")).toBeTruthy();

    fireEvent.press(screen.getByTestId("language-close"));
    fireEvent.press(screen.getByText("settings.hub.general.label"));

    expect(screen.getByTestId("settings.general.header-panel")).toBeTruthy();
    expect(screen.queryByText("settings.locale.contribute")).toBeNull();
  });

  it("returns from LanguagePicker to General root without dismissing", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.general.label"));
    fireEvent.press(screen.getByText("settings.general.language.label"));
    expect(screen.getByText("settings.locale.contribute")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("settings.general.header"));

    expect(screen.getByTestId("settings.general.header-panel")).toBeTruthy();
    expect(screen.queryByText("settings.locale.contribute")).toBeNull();
  });

  it("shows and resets the crisis placeholder without navigation", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.wellbeing.label"));
    fireEvent.press(screen.getByText("settings.wellbeing.crisis.label"));
    expect(
      within(screen.getByTestId("settings.wellbeing.header-sheet")).getByText(
        "settings.wellbeing.crisis.todo"
      )
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("settings.wellbeing.header-close"));
    fireEvent.press(screen.getByText("settings.hub.wellbeing.label"));
    expect(screen.queryByText("settings.wellbeing.crisis.todo")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows and resets acknowledgements without navigation", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.about.label"));
    fireEvent.press(screen.getByText("settings.about.acknowledgements.label"));
    expect(
      within(screen.getByTestId("settings.about.header-sheet")).getByText(
        "settings.about.acknowledgements.todo"
      )
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("settings.about.header-close"));
    fireEvent.press(screen.getByText("settings.hub.about.label"));
    expect(screen.queryByText("settings.about.acknowledgements.todo")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("reveals debug after five version taps and navigates after dismissal", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.about.label"));
    const versionRow = screen.getByText("settings.about.version");
    for (let i = 0; i < 5; i++) {
      fireEvent.press(versionRow);
    }

    fireEvent.press(
      within(screen.getByTestId("settings.about.header-sheet")).getByText("developer debug page")
    );
    expect(push).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("settings.about.header-closed"));
    expect(push).toHaveBeenCalledWith("/v2/debug");
  });

  it("interpolates the runtime version in the About panel", () => {
    renderScreen(((key: string, options?: { version?: string }) => {
      return key === "settings.about.version" ? `Version ${options?.version ?? "{{version}}"}` : key;
    }) as any);

    fireEvent.press(screen.getByText("settings.hub.about.label"));

    expect(screen.getByText("Version 2.5.0-rc.1")).toBeTruthy();
    expect(screen.queryByText("Version {{version}}")).toBeNull();
  });
});
