import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { InvitationStep } from "@/features/onboarding/steps/InvitationStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

function renderStep() {
  useOnboardingFlow.setState({
    currentStepId: "invitation",
    history: ["welcome", "privacy", "path"],
  });

  return renderWithProviders(
    <I18nProvider locale="en">
      <InvitationStep />
    </I18nProvider>,
  );
}

test("choosing the guided example jumps to g-situation", () => {
  renderStep();

  fireEvent.press(screen.getByText("Try a guided example"));

  expect(useOnboardingFlow.getState().currentStepId).toBe("g-situation");
});

test("choosing to just start writing jumps to composer", () => {
  renderStep();

  fireEvent.press(screen.getByText("Just start writing"));

  expect(useOnboardingFlow.getState().currentStepId).toBe("composer");
});

test("the guided card is tagged Recommended", () => {
  renderStep();

  expect(screen.getByText("Recommended")).toBeTruthy();
});
