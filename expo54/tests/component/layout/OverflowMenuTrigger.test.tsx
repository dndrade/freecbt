import React from "react";
import { render, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import {
  deferPress,
  OverflowMenuTrigger,
} from "@/shared/components/OverflowMenu";

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

describe("deferPress", () => {
  it("does not call the wrapped onPress synchronously", () => {
    const rafSpy = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation(() => 0);
    const onPress = jest.fn();

    deferPress(onPress)();

    expect(onPress).not.toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalledWith(onPress);

    rafSpy.mockRestore();
  });

  it("calls the wrapped onPress once the deferred frame runs", () => {
    let rafCallback: FrameRequestCallback | undefined;
    const rafSpy = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((cb) => {
        rafCallback = cb;
        return 0;
      });
    const onPress = jest.fn();

    deferPress(onPress)();
    rafCallback?.(0);

    expect(onPress).toHaveBeenCalledTimes(1);

    rafSpy.mockRestore();
  });
});
