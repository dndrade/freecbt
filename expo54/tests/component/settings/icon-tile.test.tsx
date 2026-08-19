import { screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { IconTile } from "@/src/features/settings/ui/icon-tile";
import { renderWithProviders } from "@/tests/support/render";

const useThemeColor = jest.fn((name: string) => {
  const values: Record<string, string> = {
    accent: "#111111",
    "accent-foreground": "#ffffff",
    warning: "#ff9900",
    "warning-foreground": "#331900",
  };
  return values[name] ?? name;
});

jest.mock("heroui-native", () => {
  const actual = jest.requireActual("heroui-native");
  return {
    ...actual,
    useThemeColor: (name: string) => useThemeColor(name),
  };
});

describe("IconTile", () => {
  beforeEach(() => {
    useThemeColor.mockClear();
  });

  it("defaults to the accent tone", () => {
    renderWithProviders(
      <IconTile>
        {(iconColor) => <Text testID="probe">{iconColor}</Text>}
      </IconTile>
    );

    expect(screen.getByTestId("probe").props.children).toBe("#ffffff");
    expect(useThemeColor).toHaveBeenCalledWith("accent");
    expect(useThemeColor).toHaveBeenCalledWith("accent-foreground");
  });

  it("uses semantic warning tones when requested", () => {
    renderWithProviders(
      <IconTile tone="warning">
        {(iconColor) => <Text testID="probe">{iconColor}</Text>}
      </IconTile>
    );

    expect(screen.getByTestId("probe").props.children).toBe("#331900");
    expect(useThemeColor).toHaveBeenCalledWith("warning");
    expect(useThemeColor).toHaveBeenCalledWith("warning-foreground");
  });
});
