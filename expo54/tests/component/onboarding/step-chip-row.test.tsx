import React from "react";
import { screen } from "@testing-library/react-native";
import { StepChipRow } from "@/features/onboarding/components/StepChipRow";
import { renderWithProviders as render } from "@/tests/support/render";

test("marks exactly the current step chip as selected", () => {
  render(<StepChipRow current="check" />);

  expect(
    screen.getByText("Catch it").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toBeUndefined();
  expect(
    screen.getByText("Check it").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toMatchObject({
    selected: true,
  });
});
