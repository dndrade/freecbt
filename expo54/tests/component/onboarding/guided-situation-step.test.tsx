import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { GuidedSituationStep } from "@/features/onboarding/steps/GuidedSituationStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function renderStep() {
  useOnboardingFlow.setState({
    currentStepId: "g-situation",
    situation: "interview",
  });

  return renderWithProviders(
    <I18nProvider locale="en">
      <GuidedSituationStep />
    </I18nProvider>,
  );
}

test("choosing a situation updates the example and Continue advances", () => {
  renderStep();

  expect(screen.getByText("After an interview")).toBeTruthy();
  expect(screen.getByText("After a difficult message")).toBeTruthy();
  expect(screen.getByText("After making a mistake")).toBeTruthy();

  fireEvent.press(screen.getByText("After a difficult message"));
  expect(useOnboardingFlow.getState().situation).toBe("message");

  fireEvent.press(screen.getByText("Use this example"));
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-thought");
});
