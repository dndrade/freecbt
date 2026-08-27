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

function renderStep(locale: "en" | "_test" = "en") {
  useOnboardingFlow.setState({
    currentStepId: "g-situation",
    situation: "interview",
  });

  return renderWithProviders(
    <I18nProvider locale={locale}>
      <GuidedSituationStep />
    </I18nProvider>,
  );
}

test("resolves situation titles and details through the active locale", () => {
  renderStep("_test");

  expect(screen.queryByText("After an interview")).toBeNull();
  expect(screen.getByText("weivretni na retfA")).toBeTruthy();
  expect(
    screen.getByText(".noitseuq eno rewsna ot gnol oot elttil a koot I"),
  ).toBeTruthy();
});

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
