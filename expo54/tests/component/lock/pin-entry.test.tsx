import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { PinEntry } from "@/features/lock/ui/pin-entry";
import { renderWithProviders } from "@/tests/support/render";
import { HeroUINativeProvider } from "heroui-native/provider";

function pressDigits(digits: string) {
  for (const digit of digits) {
    fireEvent.press(screen.getByTestId(`keypad-digit-${digit}`));
  }
}

describe("PinEntry", () => {
  it("renders four empty dots initially", () => {
    renderWithProviders(<PinEntry onComplete={jest.fn()} />);
    expect(screen.getAllByTestId(/^pin-dot-/)).toHaveLength(4);
    expect(
      screen.getByTestId("pin-dot-0").props.accessibilityState?.selected,
    ).toBeFalsy();
  });

  it("completes after four digits", () => {
    const onComplete = jest.fn();
    renderWithProviders(<PinEntry onComplete={onComplete} />);
    pressDigits("1234");
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("removes the last digit with backspace", () => {
    const onComplete = jest.fn();
    renderWithProviders(<PinEntry onComplete={onComplete} />);
    pressDigits("12");
    fireEvent.press(screen.getByTestId("keypad-backspace"));
    pressDigits("999");
    expect(onComplete).toHaveBeenCalledWith("1999");
  });

  it("clears its buffer when resetKey changes", () => {
    const onComplete = jest.fn();
    const { rerender } = renderWithProviders(
      <PinEntry onComplete={onComplete} resetKey={0} />,
    );
    pressDigits("12");
    rerender(
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <PinEntry onComplete={onComplete} resetKey={1} />
      </HeroUINativeProvider>,
    );
    pressDigits("3456");
    expect(onComplete).toHaveBeenCalledWith("3456");
  });
});
