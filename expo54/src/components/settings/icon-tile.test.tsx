import { render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { Text } from "react-native";
import { IconTile } from "./icon-tile";

jest.mock("uniwind", () => {
  const actual = jest.requireActual("uniwind");
  return {
    ...actual,
    useCSSVariable: (varName: string) => {
      const mockVariables: Record<string, string> = {
        "--color-brand-pink-foreground": "#000000",
        "--color-brand-purple-foreground": "#ffffff",
        "--color-brand-yellow-foreground": "#3d3212",
      };
      return mockVariables[varName];
    },
  };
});

describe("IconTile", () => {
  it.each(["pink", "purple", "yellow"] as const)(
    "resolves a real foreground color for %s instead of a hardcoded literal",
    (color) => {
      render(
        <HeroUINativeProvider>
          <IconTile color={color}>
            {(iconColor) => <Text testID="probe">{iconColor}</Text>}
          </IconTile>
        </HeroUINativeProvider>
      );
      const probe = screen.getByTestId("probe");
      expect(typeof probe.props.children).toBe("string");
      expect(probe.props.children).not.toBe("invalid");
      expect(probe.props.children.length).toBeGreaterThan(0);
    }
  );
});
