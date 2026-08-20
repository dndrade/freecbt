import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { TopBar } from "@/src/components/layout/top-bar";
import { renderWithProviders } from "@/tests/support/render";

describe("TopBar", () => {
  it("renders only a title when no back or right content is given", () => {
    renderWithProviders(<TopBar title="Settings" />);

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("exposes an accessible back button that fires onBack", () => {
    const onBack = jest.fn();
    renderWithProviders(<TopBar title="Settings" onBack={onBack} />);

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("supports a custom back label", () => {
    const onBack = jest.fn();
    renderWithProviders(
      <TopBar onBack={onBack} backAccessibilityLabel="Previous" />
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
  });

  it("renders right-slot content", () => {
    renderWithProviders(<TopBar right={<Text>Skip</Text>} />);

    expect(screen.getByText("Skip")).toBeTruthy();
  });

  it("gives the back button a 44x44 touch target", () => {
    renderWithProviders(<TopBar onBack={() => {}} />);

    const button = screen.getByRole("button", { name: "Back" });
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style;
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
  });
});
