import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { Action } from "@/src/model";
import Lock from "./lock";

const mockDispatch = jest.fn();

jest.mock("@/src/hooks/use-model", () => {
  const React = require("react");

  return {
    LoadModel: ({ ready }: { ready: React.ComponentType }) =>
      React.createElement(ready, {
        dispatch: mockDispatch,
        translate: (key: string) => key,
      }),
  };
});

jest.mock("@/src/components", () => {
  const React = require("react");
  const { Pressable, Text, TextInput, View } = require("react-native");

  return {
    PinInput: ({
      value,
      onChange,
      onComplete,
    }: {
      value: string;
      onChange: (value: string) => void;
      onComplete?: (value: string) => void;
    }) => (
      <View>
        <TextInput testID="pin" value={value} onChangeText={onChange} />
        <Pressable testID="pin-complete" onPress={() => onComplete?.(value)}>
          <Text>complete</Text>
        </Pressable>
      </View>
    ),
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Section: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("@/src/components/settings", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    SettingsHeader: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Redirect: ({ href }: { href: string }) => (
      <Text testID="redirect">{href}</Text>
    ),
  };
});

function completePin(value: string): void {
  fireEvent.changeText(screen.getByTestId("pin"), value);
  fireEvent.press(screen.getByTestId("pin-complete"));
}

beforeEach(() => {
  mockDispatch.mockClear();
});

describe("Lock PIN update workflow", () => {
  it("starts in the empty PIN-entry state", () => {
    render(<Lock />);

    expect(screen.getByText("lock_screen.update")).toBeTruthy();
    expect(screen.getByTestId("pin").props.value).toBe("");
  });

  it("moves to confirmation for four digits and filters non-numeric input", () => {
    render(<Lock />);

    completePin("12a34");

    expect(screen.getByText("lock_screen.confirm")).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("resets to empty entry for a non-four-digit first PIN", () => {
    render(<Lock />);

    completePin("123");

    expect(screen.getByText("lock_screen.update")).toBeTruthy();
    expect(screen.getByTestId("pin").props.value).toBe("");
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("dispatches a matching PIN once and redirects when done", () => {
    render(<Lock />);

    completePin("1234");
    expect(mockDispatch).not.toHaveBeenCalled();

    completePin("1234");

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(Action.setPincode("1234"));
    expect(screen.getByTestId("redirect").props.children).toBe("/v2/settings");
  });

  it("resets after a mismatched confirmation without dispatching a PIN", () => {
    render(<Lock />);

    completePin("1234");
    completePin("9999");

    expect(screen.getByText("lock_screen.update")).toBeTruthy();
    expect(screen.getByTestId("pin").props.value).toBe("");
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
