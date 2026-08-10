import { render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { Text } from "react-native";
import { IconTile } from "./icon-tile";

// Mock useCSSVariable from uniwind.
// RATIONALE: Uniwind's useCSSVariable hook resolves CSS variables at the Metro/Babel
// build-time layer, registering them during CSS module transformation. Jest's ts-jest
// and babel-jest transforms don't perform this registration, so useCSSVariable always
// returns undefined in this test environment. This means the test cannot verify real
// CSS variable resolution end-to-end; it can only verify that the component correctly
// calls useCSSVariable and handles its return value. To verify that Task 1's CSS
// variables (--color-brand-*-foreground in freecbt.css) actually resolve in the real
// app, integration testing or visual inspection of a running app is required.
jest.mock("uniwind", () => {
  const actual = jest.requireActual("uniwind");
  return {
    ...actual,
    useCSSVariable: (varName: string) => {
      // Map CSS variable names to test values covering different code paths:
      // - string: real color value
      // - number: numeric color value (tested via coercion)
      // - undefined: unresolved variable (tested via "invalid" fallback)
      const testValues: Record<string, string | number | undefined> = {
        "--color-brand-pink-foreground": "#000000", // string branch
        "--color-brand-purple-foreground": 0xffffff, // number branch (coerced to string)
        "--color-brand-yellow-foreground": undefined, // "invalid" fallback branch
      };
      return testValues[varName];
    },
  };
});

describe("IconTile", () => {
  it("resolves string foreground color for pink", () => {
    render(
      <HeroUINativeProvider>
        <IconTile color="pink">
          {(iconColor) => <Text testID="probe">{iconColor}</Text>}
        </IconTile>
      </HeroUINativeProvider>
    );
    const probe = screen.getByTestId("probe");
    expect(probe.props.children).toBe("#000000");
  });

  it("coerces numeric foreground color to string for purple", () => {
    render(
      <HeroUINativeProvider>
        <IconTile color="purple">
          {(iconColor) => <Text testID="probe">{iconColor}</Text>}
        </IconTile>
      </HeroUINativeProvider>
    );
    const probe = screen.getByTestId("probe");
    expect(probe.props.children).toBe("16777215"); // String(0xffffff)
  });

  it("falls back to 'invalid' for unresolved yellow variable", () => {
    render(
      <HeroUINativeProvider>
        <IconTile color="yellow">
          {(iconColor) => <Text testID="probe">{iconColor}</Text>}
        </IconTile>
      </HeroUINativeProvider>
    );
    const probe = screen.getByTestId("probe");
    expect(probe.props.children).toBe("invalid");
  });
});
