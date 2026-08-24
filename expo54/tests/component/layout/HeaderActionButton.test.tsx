import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import {
  HeaderActionButton,
  backHeaderAction,
} from "@/shared/components/Layout/Base/HeaderActionButton";

describe("HeaderActionButton", () => {
  it("fires action.onPress when standalone", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <HeaderActionButton
        action={{ icon: "close", accessibilityLabel: "Close", onPress }}
      />,
    );
    fireEvent.press(screen.getByLabelText("Close"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("prefers an injected onPress prop over action.onPress", () => {
    const actionOnPress = jest.fn();
    const injectedOnPress = jest.fn();
    renderWithProviders(
      <HeaderActionButton
        action={{
          icon: "close",
          accessibilityLabel: "Close",
          onPress: actionOnPress,
        }}
        onPress={injectedOnPress}
      />,
    );
    fireEvent.press(screen.getByLabelText("Close"));
    expect(injectedOnPress).toHaveBeenCalledTimes(1);
    expect(actionOnPress).not.toHaveBeenCalled();
  });
});

describe("backHeaderAction", () => {
  it("builds an LTR back action with the left chevron", () => {
    const onPress = jest.fn();
    const action = backHeaderAction(onPress);
    expect(action.icon).toBe("chevron-left");
    expect(action.accessibilityLabel).toBe("Back");
    expect(action.accessibilityHint).toBe("Navigates to previous screen");
    action.onPress?.();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("accepts an accessibilityLabel override", () => {
    const action = backHeaderAction(jest.fn(), {
      accessibilityLabel: "Previous step",
    });
    expect(action.accessibilityLabel).toBe("Previous step");
  });
});
