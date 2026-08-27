import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { GuidedThoughtStep } from "@/features/onboarding/steps/GuidedThoughtStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function renderStep(locale: "en" | "_test" = "en") {
  useOnboardingFlow.setState({
    currentStepId: "g-thought",
    situation: "interview",
    revealed: false,
  });

  return renderWithProviders(
    <I18nProvider locale={locale}>
      <GuidedThoughtStep />
    </I18nProvider>,
  );
}

test("the automatic thought is hidden until Reveal is tapped", () => {
  renderStep();

  expect(screen.queryByText("I probably failed.")).toBeNull();

  fireEvent.press(screen.getByText("Reveal the thought"));
  expect(useOnboardingFlow.getState().revealed).toBe(true);
  expect(screen.getByText("“I probably failed.”")).toBeTruthy();
});

test("Continue advances after the automatic thought is revealed", () => {
  renderStep();

  fireEvent.press(screen.getByText("Reveal the thought"));
  fireEvent.press(screen.getByText("Check the pattern"));

  expect(useOnboardingFlow.getState().currentStepId).toBe("g-pattern");
});

test("resolves the automatic thought through the active locale", () => {
  renderStep("_test");

  fireEvent.press(screen.getByText("thguoht eht laeveR"));

  expect(screen.queryByText("“I probably failed.”")).toBeNull();
  expect(screen.getByText("“.deliaf ylbaborp I”")).toBeTruthy();
});
