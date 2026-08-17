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

  it("groups experiments by family and shows no empty speculative sections", () => {
    render(<LabIndex />);

    expect(screen.getByText(/Onboarding/)).toBeTruthy();
    expect(screen.queryByText(/Foundations/)).toBeNull();
    expect(screen.queryByText(/Components/)).toBeNull();
    expect(screen.queryByText(/Experiments -/)).toBeNull();
  });

  it("navigates into the selected variant", () => {
    render(<LabIndex />);

    fireEvent.press(screen.getByRole("button", { name: "Current" }));

    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/onboarding");
  });
});
