import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { GuidedCompleteStep } from "@/features/onboarding/steps/GuidedCompleteStep";
import { I18nProvider } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

test("shows the practiced alternative thought and advances to Your Turn", () => {
  useOnboardingFlow.setState({
    currentStepId: "g-complete",
    guidedAlternative: "I can learn from this.",
  });

  renderWithProviders(
    <I18nProvider locale="en">
      <GuidedCompleteStep />
    </I18nProvider>,
  );

  expect(screen.getByText("Your balanced thought")).toBeTruthy();
  expect(screen.getByText("I can learn from this.")).toBeTruthy();

  fireEvent.press(
    screen.getByRole("button", { name: "Write my first thought" }),
  );
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-your-turn");
});
