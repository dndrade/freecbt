import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { I18nProvider } from "@/i18n/use-i18n";
import { GuidedEvidenceStep } from "@/features/onboarding/steps/GuidedEvidenceStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function renderStep(locale: "en" | "_test" = "en") {
  useOnboardingFlow.setState({
    currentStepId: "g-evidence",
    situation: "interview",
    selectedEvidenceIds: [],
  });

  return renderWithProviders(
    <I18nProvider locale={locale}>
      <GuidedEvidenceStep />
    </I18nProvider>,
  );
}

test("shows the situation's evidence, gates Continue, and supports multi-select", () => {
  renderStep();

  expect(screen.getByText("I paused before answering.")).toBeTruthy();
  expect(
    screen.getByText("The other person kept talking with me."),
  ).toBeTruthy();
  expect(
    screen.getByText("One part wasn't perfect — not all of it."),
  ).toBeTruthy();
  expect(
    screen.getByText("I don't actually know the outcome yet."),
  ).toBeTruthy();

  const evidence = screen.getByRole("button", {
    name: "I paused before answering.",
  });
  const continueButton = screen.getByRole("button", {
    name: "Build a balanced thought",
  });
  expect(evidence.props.accessibilityState).toMatchObject({ selected: false });
  expect(continueButton.props.accessibilityState).toMatchObject({
    disabled: true,
  });

  fireEvent.press(evidence);
  expect(useOnboardingFlow.getState().selectedEvidenceIds).toEqual([
    "I paused before answering.",
  ]);
  expect(
    screen.getByRole("button", { name: "I paused before answering." }).props
      .accessibilityState,
  ).toMatchObject({
    selected: true,
  });
  fireEvent.press(
    screen.getByRole("button", {
      name: "The other person kept talking with me.",
    }),
  );
  expect(useOnboardingFlow.getState().selectedEvidenceIds).toEqual([
    "I paused before answering.",
    "The other person kept talking with me.",
  ]);

  fireEvent.press(continueButton);
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-alternative");
});

test("resolves evidence through the active locale", () => {
  renderStep("_test");

  expect(screen.queryByText("I paused before answering.")).toBeNull();
  expect(screen.getByText(".gnirewsna erofeb desuap I")).toBeTruthy();
});
