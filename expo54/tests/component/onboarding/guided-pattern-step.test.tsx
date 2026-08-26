import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { GuidedPatternStep } from "@/features/onboarding/steps/GuidedPatternStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function renderStep() {
  useOnboardingFlow.setState({
    currentStepId: "g-pattern",
    situation: "interview",
    selectedDistortionSlugs: [],
  });

  return renderWithProviders(
    <I18nProvider locale="en">
      <GuidedPatternStep />
    </I18nProvider>,
  );
}

test("shows the situation's real distortions, gates Continue, and supports multi-select", () => {
  renderStep();

  expect(screen.getByText("Fortune Telling")).toBeTruthy();
  expect(screen.getByText('ex: "I\'ll get sick at the party"')).toBeTruthy();
  expect(screen.getByText("Catastrophizing")).toBeTruthy();
  expect(screen.getByText("Labeling")).toBeTruthy();

  const fortuneTelling = screen.getByRole("button", {
    name: "Fortune Telling",
  });
  const continueButton = screen.getByRole("button", {
    name: "Check the evidence",
  });
  expect(fortuneTelling.props.accessibilityState).toMatchObject({
    selected: false,
  });
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: true,
  });

  fireEvent.press(fortuneTelling);
  expect(useOnboardingFlow.getState().selectedDistortionSlugs).toEqual([
    "fortune-telling",
  ]);
  expect(
    screen.getByRole("button", { name: "Fortune Telling" }).props
      .accessibilityState,
  ).toMatchObject({
    selected: true,
  });
  fireEvent.press(screen.getByRole("button", { name: "Catastrophizing" }));
  expect(useOnboardingFlow.getState().selectedDistortionSlugs).toEqual([
    "fortune-telling",
    "catastrophizing",
  ]);

  fireEvent.press(continueButton);
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-evidence");
});
