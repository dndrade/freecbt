import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { WelcomeStep } from "@/features/onboarding/steps/WelcomeStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";

test("tapping Get started advances the flow", () => {
  useOnboardingFlow.setState({ currentStepId: "welcome", history: [] });
  renderWithProviders(
    <I18nProvider locale="en">
      <WelcomeStep />
    </I18nProvider>,
  );
  fireEvent.press(screen.getByText("Get started"));
  expect(useOnboardingFlow.getState().currentStepId).toBe("privacy");
});
