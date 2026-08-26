import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { GuidedYourTurnStep } from "@/features/onboarding/steps/GuidedYourTurnStep";
import { I18nProvider } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

test("Continue is whitespace-gated and calls finishOnboarding", () => {
  const finishOnboarding = jest.fn().mockResolvedValue({ status: "saved" });
  useOnboardingFlow.setState({
    currentStepId: "g-your-turn",
    guidedPersonalThought: "",
    finishOnboarding,
  });

  renderWithProviders(
    <I18nProvider locale="en">
      <GuidedYourTurnStep />
    </I18nProvider>,
  );

  const continueButton = screen.getByRole("button", { name: "Continue" });
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: true,
  });

  fireEvent.changeText(
    screen.getByPlaceholderText("Write a thought..."),
    "I'm nervous but ready",
  );
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: false,
  });

  fireEvent.press(continueButton);
  expect(finishOnboarding).toHaveBeenCalledTimes(1);
});
