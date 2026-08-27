import React from "react";
import { screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { StepChipRow } from "@/features/onboarding/components/StepChipRow";
import { renderWithProviders as render } from "@/tests/support/render";

test("marks exactly the current step chip as selected", () => {
  render(
    <I18nProvider locale="_test">
      <StepChipRow current="check" />
    </I18nProvider>,
  );

  expect(
    screen.getByText("ti hctaC").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toBeUndefined();
  expect(
    screen.getByText("ti kcehC").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toMatchObject({
    selected: true,
  });
  expect(
    screen.getByText("ti egnellahC").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toBeUndefined();
  expect(
    screen.getByText("ti egnahC").parent?.parent?.parent?.parent?.props
      .accessibilityState,
  ).toBeUndefined();
});
