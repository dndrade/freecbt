import React from "react";
import { render, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { OverflowMenuTrigger } from "@/shared/components/OverflowMenu";

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
