import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { PrivacyStep } from "@/features/onboarding/steps/PrivacyStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";

test("shows the three trust chips and advances on Continue", () => {
  useOnboardingFlow.setState({
    currentStepId: "privacy",
    history: ["welcome"],
  });
  renderWithProviders(
    <I18nProvider locale="en">
      <PrivacyStep />
    </I18nProvider>,
  );
  expect(screen.getByText("Local-first")).toBeTruthy();
  expect(screen.getByText("No sign-in")).toBeTruthy();
  expect(screen.getByText("Your choice")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));
  expect(useOnboardingFlow.getState().currentStepId).toBe("path");
});
