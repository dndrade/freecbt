import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { renderWithProviders } from "@/tests/support/render";
import { OverflowMenuTrigger } from "@/shared/components/OverflowMenu";

let mockOnOpenChange: ((isOpen: boolean) => void) | undefined;
let mockAnimationFrame: FrameRequestCallback | undefined;

jest.mock("heroui-native", () => {
  const actual = jest.requireActual("heroui-native");
  const Menu = Object.assign(
    (props: {
      children: React.ReactNode;
      onOpenChange?: (isOpen: boolean) => void;
    }) => {
      mockOnOpenChange = props.onOpenChange;
      return props.children;
    },
    {
      Trigger: ({ children }: { children: React.ReactNode }) => (
        <Pressable
          testID="overflow-menu-trigger"
          onPress={() => mockOnOpenChange?.(true)}
        >
          {children}
        </Pressable>
      ),
      Portal: ({ children }: { children: React.ReactNode }) => children,
      Overlay: () => null,
      Content: ({ children }: { children: React.ReactNode }) => children,
      Item: ({
        children,
        onPress,
      }: {
        children: React.ReactNode;
        onPress: () => void;
      }) => (
        <Pressable
          testID="overflow-menu-item"
          onPress={() => {
            onPress();
            mockAnimationFrame?.(0);
            mockOnOpenChange?.(false);
          }}
        >
          {children}
        </Pressable>
      ),
      ItemTitle: ({ children }: { children: React.ReactNode }) => (
        <Text>{children}</Text>
      ),
    },
  );

  return { ...actual, Menu };
});

beforeEach(() => {
  mockOnOpenChange = undefined;
  mockAnimationFrame = undefined;
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => {
    mockAnimationFrame = callback;
    return 0;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("OverflowMenuTrigger", () => {
  it("renders nothing for an empty items array", () => {
    const { toJSON } = render(<OverflowMenuTrigger items={[]} />);
    expect(toJSON()).toBeNull();
  });

  it("renders a trigger for non-empty items", () => {
    renderWithProviders(
      <OverflowMenuTrigger items={[{ label: "Export", onPress: jest.fn() }]} />,
    );
    expect(screen.getByLabelText("More options")).toBeTruthy();
  });
});

describe("menu item navigation", () => {
  it("waits for HeroUI to close the menu before scheduling navigation", () => {
    const onPress = jest.fn();

    renderWithProviders(
      <OverflowMenuTrigger items={[{ label: "Settings", onPress }]} />,
    );

    fireEvent.press(screen.getByTestId("overflow-menu-trigger"));
    fireEvent.press(screen.getByTestId("overflow-menu-item"));

    expect(onPress).not.toHaveBeenCalled();
    mockAnimationFrame?.(0);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
