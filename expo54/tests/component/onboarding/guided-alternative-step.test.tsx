import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { GuidedAlternativeStep } from "@/features/onboarding/steps/GuidedAlternativeStep";
import { I18nProvider } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function renderStep(locale: "en" | "_test" = "en") {
  useOnboardingFlow.setState({
    currentStepId: "g-alternative",
    situation: "interview",
    guidedAlternative: "",
  });

  return renderWithProviders(
    <I18nProvider locale={locale}>
      <GuidedAlternativeStep />
    </I18nProvider>,
  );
}

test("phrase chips append to the textarea and gate Continue", () => {
  renderStep();

  const continueButton = screen.getByRole("button", {
    name: "Save this practice",
  });
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: true,
  });

  fireEvent.press(
    screen.getByRole("button", {
      name: "I may not have done this perfectly",
    }),
  );

  expect(useOnboardingFlow.getState().guidedAlternative).toBe(
    "I may not have done this perfectly.",
  );
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: false,
  });

  fireEvent.press(continueButton);
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-complete");
});

test("resolves phrase suggestions through the active locale", () => {
  renderStep("_test");

  expect(
    screen.queryByRole("button", {
      name: "I may not have done this perfectly",
    }),
  ).toBeNull();
  expect(
    screen.getByRole("button", {
      name: "yltcefrep siht enod evah ton yam I",
    }),
  ).toBeTruthy();
});
