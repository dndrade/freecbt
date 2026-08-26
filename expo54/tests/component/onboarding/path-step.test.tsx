import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";
import { PathStep } from "@/features/onboarding/steps/PathStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";

test("shows all four CBT-path nodes and advances on Continue", () => {
  useOnboardingFlow.setState({
    currentStepId: "path",
    history: ["welcome", "privacy"],
  });
  renderWithProviders(
    <I18nProvider locale="en">
      <PathStep />
    </I18nProvider>,
  );
  expect(screen.getByText("Thought")).toBeTruthy();
  expect(screen.getByText("Pattern")).toBeTruthy();
  expect(screen.getByText("Challenge")).toBeTruthy();
  expect(screen.getByText("Alternative")).toBeTruthy();
  fireEvent.press(screen.getByText("Continue"));
  expect(useOnboardingFlow.getState().currentStepId).toBe("invitation");
});
