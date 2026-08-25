import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { ContinueButton } from "@/features/onboarding/components/ContinueButton";
import { renderWithProviders as render } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

jest.mock("@/shared/components", () => {
  const { Pressable } = require("react-native");
  const React = require("react");

  return {
    Button: ({
      title,
      onPress,
      disabled,
      testID,
    }: {
      title: string;
      onPress: () => void;
      disabled?: boolean;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", disabled, onPress, testID },
        title,
      ),
  };
});

test("is pressable when enabled and inert when disabled", () => {
  const onPress = jest.fn();
  const disabled = render(
    <ContinueButton
      title="Continue"
      onPress={onPress}
      disabled
      testID="disabled"
    />,
  );

  fireEvent.press(disabled.getByTestId("disabled"));
  expect(onPress).not.toHaveBeenCalled();

  const enabled = render(
    <ContinueButton title="Continue" onPress={onPress} testID="enabled" />,
  );
  fireEvent.press(enabled.getByTestId("enabled"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
