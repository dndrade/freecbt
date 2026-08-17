import { act, render } from "@testing-library/react-native";
import React, { useEffect, useReducer } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "./layout/screen";
import { SettingsCard } from "@/src/features/settings/ui/settings-card";

let theme: "light" | "dark" = "light";
const listeners = new Set<() => void>();

jest.mock("uniwind", () => {
  const actual = jest.requireActual("uniwind");
  return {
    ...actual,
    useCSSVariable: (names: string | string[]) => {
      const [, rerender] = useReducer((x) => x + 1, 0);
      useEffect(() => {
        listeners.add(rerender);
        return () => {
          listeners.delete(rerender);
        };
      }, []);

      const value = (name: string) => {
        if (name === "--color-background") {
          return theme === "light" ? "white" : "black";
        }
        if (name === "--color-surface") {
          return theme === "light" ? "#f7f7f7" : "#333333";
        }
        return "invalid";
      };

      return Array.isArray(names) ? names.map(value) : value(names);
    },
  };
});

function switchTheme(next: "light" | "dark") {
  theme = next;
  for (const listener of listeners) listener();
}

describe("theme surfaces", () => {
  beforeEach(() => {
    theme = "light";
    listeners.clear();
  });

  it("updates the mounted Screen background when the theme changes", () => {
    const { UNSAFE_getByType } = render(<Screen>content</Screen>);
    const root = () => UNSAFE_getByType(SafeAreaView);

    expect(root().props.style).toEqual({ flex: 1, backgroundColor: "white" });

    act(() => switchTheme("dark"));

    expect(root().props.style).toEqual({ flex: 1, backgroundColor: "black" });
  });

  it("updates the mounted SettingsCard surface when the theme changes", () => {
    const { UNSAFE_getByType } = render(<SettingsCard>content</SettingsCard>);
    const card = () => UNSAFE_getByType(View);

    expect(card().props.style).toEqual({ backgroundColor: "#f7f7f7" });

    act(() => switchTheme("dark"));

    expect(card().props.style).toEqual({ backgroundColor: "#333333" });
  });
});
