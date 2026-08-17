import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import UiLabIndex from "../../app/v2/debug/lab/index";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src/debug/ui/debug-screen", () => ({
  DebugScreen: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
}));

jest.mock("@/src/debug/ui/debug-section", () => ({
  DebugSection: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
}));

jest.mock("@/src/debug/ui/debug-action", () => ({
  DebugAction: (props: {
    label: string;
    detail?: string;
    onPress: () => void;
  }) =>
    React.createElement(
      Pressable,
      { accessibilityRole: "button", onPress: props.onPress },
      React.createElement(Text, null, props.label),
      props.detail ? React.createElement(Text, null, props.detail) : null,
    ),
}));

describe("ui lab index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the onboarding lab entry and routes to it", () => {
    render(<UiLabIndex />);

    expect(screen.getByRole("button", { name: "Onboarding" })).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Onboarding" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/onboarding");
  });
});
