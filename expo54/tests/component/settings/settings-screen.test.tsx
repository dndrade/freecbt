import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { existsSync } from "fs";
import path from "node:path";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SettingsScreen } from "@/src/features/settings/settings-screen";

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

jest.mock("heroui-native", () => {
  const TypographyMock = ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;
  TypographyMock.Heading = TypographyMock;
  return {
    Typography: TypographyMock,
    useThemeColor: () => "#000000",
  };
});

jest.mock("@/src/features/settings/ui/settings-card", () => ({
  SettingsCard: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
}));

jest.mock("@/src/features/settings/ui/settings-row", () => ({
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

jest.mock("@/src/features/settings/ui/appearance-picker", () => ({ AppearancePicker: mockPanel("appearance") }));
jest.mock("@/src/features/settings/ui/journal-picker", () => ({ JournalPicker: mockPanel("journal") }));
jest.mock("@/src/features/settings/ui/language-picker", () => ({
  LanguagePickerContent: ({ onBack }: { onBack: () => void }) => (
    <View>
      <Text>settings.locale.contribute</Text>
      <Pressable accessibilityLabel="settings.general.header" onPress={onBack}>
        <Text>back</Text>
      </Pressable>
    </View>
  ),
}));
const generalSheetMountCount = { current: 0 };

jest.mock("@/src/features/settings/ui/settings-sheet", () => {
  // jest.mock factories can't reference out-of-scope imports (only `mock`-prefixed
  // bindings), so React must be required here rather than using the top-level import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require("react");
  const actual = jest.requireActual("@/src/features/settings/ui/settings-sheet");

  return {
    ...actual,
    SettingsSheet: ({
      title,
      isOpen,
      onOpenChange,
      onClosed,
      children,
    }: {
      title: string;
      isOpen: boolean;
      onOpenChange: (open: boolean) => void;
      onClosed?: () => void;
      children: React.ReactNode;
    }) => {
      // Tracks mounts of the general/language sheet specifically, so a
      // regression that swaps the underlying sheet component instead of
      // reusing it (see: fix/settings-language-picker-sheet-swap) shows up
      // as a mount count > 1 instead of silently passing.
      ReactActual.useEffect(() => {
        if (title === "settings.general.header" || title === "settings.general.language.label") {
          generalSheetMountCount.current += 1;
        }
      }, []);

      return (
        <View>
          {isOpen ? (
            <View testID={`${title}-sheet`}>
              <Text testID={`${title}-panel`}>{title}</Text>
              {children}
              <Pressable testID={`${title}-close`} onPress={() => onOpenChange(false)}>
                <Text>close</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable testID={`${title}-closed`} onPress={onClosed}>
            <Text>closed</Text>
          </Pressable>
        </View>
      );
    },
  };
});
jest.mock("@/src/features/settings/ui/settings-panel", () => ({
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
    generalSheetMountCount.current = 0;
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), back: jest.fn() });
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
      expect(
        existsSync(
          path.join(__dirname, "../../../src/features/settings/ui", name)
        )
      ).toBe(false);
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

    fireEvent.press(screen.getByTestId("settings.general.language.label-close"));
    fireEvent.press(screen.getByText("settings.hub.general.label"));

    expect(screen.getByTestId("settings.general.header-panel")).toBeTruthy();
    expect(screen.queryByText("settings.locale.contribute")).toBeNull();
  });

  it("hosts one persistent sheet across the general/language switch instead of remounting it", () => {
    renderScreen();

    fireEvent.press(screen.getByText("settings.hub.general.label"));
    expect(generalSheetMountCount.current).toBe(1);

    fireEvent.press(screen.getByText("settings.general.language.label"));
    expect(generalSheetMountCount.current).toBe(1);

    fireEvent.press(screen.getByLabelText("settings.general.header"));
    expect(generalSheetMountCount.current).toBe(1);
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
