import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import Animated from "react-native-reanimated";
import { FlowAction } from "./flow-action";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

jest.mock("@expo/vector-icons", () => ({ Feather: () => null }));

jest.mock("uniwind", () => ({
  ...jest.requireActual("uniwind"),
  useCSSVariable: (names: string[]) => names.map(() => "#000"),
}));

describe("FlowAction", () => {
  it.each([
    ["next", "Next"],
    ["final", "Get started"],
  ] as const)("exposes one button in %s state", (state, label) => {
    render(
      <HeroUINativeProvider
        config={{ toast: false, devInfo: { stylingPrinciples: false } }}
      >
        <FlowAction
          state={state}
          onPress={jest.fn()}
          accessibilityLabel={label}
          finalLabel="Get started"
        />
      </HeroUINativeProvider>
    );

    expect(screen.getAllByRole("button", { name: label })).toHaveLength(1);
  });

  it("does not press when disabled", () => {
    const onPress = jest.fn();
    render(
      <HeroUINativeProvider
        config={{ toast: false, devInfo: { stylingPrinciples: false } }}
      >
        <FlowAction
          state="final"
          isDisabled
          onPress={onPress}
          accessibilityLabel="Get started"
          finalLabel="Get started"
        />
      </HeroUINativeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: "Get started" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("translates the arrow and final content as it morphs", () => {
    render(
      <HeroUINativeProvider
        config={{ toast: false, devInfo: { stylingPrinciples: false } }}
      >
        <FlowAction
          state="final"
          onPress={jest.fn()}
          accessibilityLabel="Get started"
          finalLabel="Get started"
        />
      </HeroUINativeProvider>
    );

    const [, arrow, finalContent] = screen.UNSAFE_getAllByType(Animated.View);
    expect(arrow.props.style).toEqual(
      expect.objectContaining({ transform: expect.any(Array) })
    );
    expect(finalContent.props.style).toEqual(
      expect.objectContaining({ transform: expect.any(Array) })
    );
  });
});
