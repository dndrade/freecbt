import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import DebugIndex from "../app/v2/debug/index";

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
      props.detail ? React.createElement(Text, null, props.detail) : null
    ),
}));

describe("debug index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows only the four top-level destinations", () => {
    render(<DebugIndex />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "UI/UX Lab" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Feature Diagnostics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tools" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Logic Demos" })).toBeTruthy();
  });

  it("navigates into the lab subtree", () => {
    render(<DebugIndex />);

    fireEvent.press(screen.getByRole("button", { name: "UI/UX Lab" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab");
  });
});
