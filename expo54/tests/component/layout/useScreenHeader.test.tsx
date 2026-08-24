import React from "react";
import { fireEvent, renderHook, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { renderWithProviders } from "@/tests/support/render";
import {
  buildHeaderOptions,
  useScreenHeader,
} from "@/shared/components/Layout/Base/useScreenHeader";
import {
  backHeaderAction,
  type HeaderAction,
} from "@/shared/components/Layout/Base/HeaderActionButton";

const setOptions = jest.fn();
const navigation = { setOptions };

jest.mock("expo-router", () => ({
  useNavigation: () => navigation,
}));

describe("buildHeaderOptions", () => {
  it("resolves headerTitle from title", () => {
    expect(buildHeaderOptions({ title: "Settings" }).headerTitle).toBe(
      "Settings",
    );
  });

  it("resolves headerLeft from leftAction", () => {
    const options = buildHeaderOptions({
      leftAction: backHeaderAction(jest.fn()),
    });
    expect(options.headerLeft).toBeDefined();
    renderWithProviders(options.headerLeft!());
    expect(screen.getByLabelText("Back")).toBeTruthy();
  });

  it("has no headerLeft when leftAction is omitted", () => {
    expect(buildHeaderOptions({}).headerLeft).toBeUndefined();
  });

  it("resolves headerRight from rightAction", () => {
    const options = buildHeaderOptions({
      rightAction: {
        icon: "settings",
        accessibilityLabel: "Settings",
        onPress: jest.fn(),
      },
    });
    renderWithProviders(options.headerRight!());
    expect(screen.getByLabelText("Settings")).toBeTruthy();
  });

  it("resolves headerRight from overflowItems via OverflowMenuTrigger", () => {
    const options = buildHeaderOptions({
      overflowItems: [{ label: "Export", onPress: jest.fn() }],
    });
    renderWithProviders(options.headerRight!());
    expect(screen.getByLabelText("More options")).toBeTruthy();
  });

  it("prioritizes rightElement over rightAction and overflowItems", () => {
    const options = buildHeaderOptions({
      rightElement: <Text>custom</Text>,
      rightAction: {
        icon: "settings",
        accessibilityLabel: "Settings",
        onPress: jest.fn(),
      },
      overflowItems: [{ label: "Export", onPress: jest.fn() }],
    });
    renderWithProviders(options.headerRight!());
    expect(screen.getByText("custom")).toBeTruthy();
  });

  it("prioritizes rightAction over overflowItems", () => {
    const options = buildHeaderOptions({
      rightAction: {
        icon: "settings",
        accessibilityLabel: "Settings",
        onPress: jest.fn(),
      },
      overflowItems: [{ label: "Export", onPress: jest.fn() }],
    });
    renderWithProviders(options.headerRight!());
    expect(screen.getByLabelText("Settings")).toBeTruthy();
    expect(screen.queryByLabelText("More options")).toBeNull();
  });

  it("has no headerRight when nothing is provided", () => {
    expect(buildHeaderOptions({}).headerRight).toBeUndefined();
  });
});

describe("useScreenHeader", () => {
  it("calls navigation.setOptions with the built options", () => {
    function Harness() {
      useScreenHeader({ title: "Settings" });
      return null;
    }

    setOptions.mockClear();
    renderWithProviders(<Harness />);
    expect(setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ headerTitle: "Settings" }),
    );
  });

  it("updates header options when a right action changes without changing its icon", () => {
    const initialOnPress = jest.fn();
    const updatedOnPress = jest.fn();
    const initialAction: HeaderAction = {
      icon: "settings",
      accessibilityLabel: "Settings",
      onPress: initialOnPress,
    };
    const updatedAction: HeaderAction = {
      icon: "settings",
      accessibilityLabel: "Updated settings",
      accessibilityHint: "Opens updated settings",
      onPress: updatedOnPress,
    };

    setOptions.mockClear();
    const { rerender } = renderHook(
      ({ rightAction }: { rightAction: HeaderAction }) =>
        useScreenHeader({ rightAction }),
      { initialProps: { rightAction: initialAction } },
    );
    setOptions.mockClear();
    rerender({ rightAction: updatedAction });

    const updatedOptions = setOptions.mock.calls[0]?.[0];
    expect(updatedOptions).toEqual(
      expect.objectContaining({ headerRight: expect.any(Function) }),
    );
    renderWithProviders(updatedOptions.headerRight());
    fireEvent.press(screen.getByLabelText("Updated settings"));
    expect(updatedOnPress).toHaveBeenCalledTimes(1);
    expect(initialOnPress).not.toHaveBeenCalled();
  });
});
