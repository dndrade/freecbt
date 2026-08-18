import { render, screen } from "@testing-library/react-native";
import React from "react";
import { FlowProgress } from "./flow-progress";

describe("FlowProgress", () => {
  it("delegates the segmented semantic contract", () => {
    render(
      <FlowProgress
        variant="segmented"
        currentIndex={1}
        count={3}
        accessibilityLabel="Onboarding progress"
      />
    );

    expect(
      screen.getByRole("progressbar", { name: "Onboarding progress" })
    ).toHaveProp("accessibilityValue", {
      min: 1,
      max: 3,
      now: 2,
      text: "Step 2 of 3",
    });
  });
});
