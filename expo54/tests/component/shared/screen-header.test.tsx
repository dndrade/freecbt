import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { ScreenHeader } from "@/src/components/layout/screen-header";
import { renderWithProviders } from "@/tests/support/render";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe("ScreenHeader", () => {
  it("does not expose a back button for the root Settings destination", () => {
    renderWithProviders(<ScreenHeader title="Settings" showBack={false} />);

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("exposes an accessible back button when enabled", () => {
    renderWithProviders(<ScreenHeader title="Settings" />);

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Settings")).toBeTruthy();
  });
});
