import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import LabIndex from "@/src/app/v2/debug/lab/index";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("lab index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the families without variant-level clutter", () => {
    render(<LabIndex />);

    expect(screen.getByText(/Onboarding/)).toBeTruthy();
    expect(screen.getByText(/Settings/)).toBeTruthy();
    expect(screen.queryByText(/^Current$/)).toBeNull();
  });

  it("navigates into the selected family", () => {
    render(<LabIndex />);

    fireEvent.press(screen.getByRole("button", { name: "Settings" }));

    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/settings");

    fireEvent.press(screen.getByRole("button", { name: "Onboarding" }));

    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/onboarding");
  });
});
