import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { SelectableCard } from "@/shared/components/SelectableCard/SelectableCard";
import { renderWithProviders as render } from "@/tests/support/render";

describe("SelectableCard", () => {
  it("renders title and detail, and exposes selected via accessibilityState", () => {
    render(
      <SelectableCard
        title="After an interview"
        detail="One question took a while."
        selected
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText("After an interview")).toBeTruthy();
    expect(screen.getByText("One question took a while.")).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it("calls onPress when tapped, and not when disabled", () => {
    const onPress = jest.fn();
    render(
      <SelectableCard
        title="Fortune telling"
        selected={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);

    onPress.mockClear();
    const disabledCard = render(
      <SelectableCard
        title="Fortune telling"
        selected={false}
        onPress={onPress}
        disabled
        testID="disabled-card"
      />,
    );
    fireEvent.press(disabledCard.getByTestId("disabled-card"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("renders a tag when given (Invitation cards)", () => {
    render(
      <SelectableCard
        title="Try a guided example"
        selected={false}
        onPress={jest.fn()}
        tag="Recommended"
      />,
    );
    expect(screen.getByText("Recommended")).toBeTruthy();
  });

  it("renders a checkmark affordance only in the check variant, reflecting selection", () => {
    render(
      <SelectableCard
        title="I paused before answering."
        selected={false}
        onPress={jest.fn()}
        variant="check"
        testID="evidence-1"
      />,
    );
    expect(
      screen.getByTestId("evidence-1-check", { includeHiddenElements: true })
        .props.accessibilityElementsHidden,
    ).toBe(true);
    render(
      <SelectableCard
        title="I paused before answering."
        selected
        onPress={jest.fn()}
        variant="check"
        testID="evidence-1"
      />,
    );
    expect(screen.getByTestId("evidence-1-check")).toBeTruthy();
  });
});
