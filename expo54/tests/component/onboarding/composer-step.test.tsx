import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { I18n } from "i18n-js";
import { I18nProvider } from "@/i18n/use-i18n";
import locales from "@/i18n/locals";
import { ComposerStep } from "@/features/onboarding/steps/ComposerStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { renderWithProviders } from "@/tests/support/render";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

const i18n = new I18n(locales);
i18n.locale = "en";
const continueLabel = i18n.t("onboarding_screen.composer.cta");

beforeEach(() => {
  useOnboardingFlow.setState({
    currentStepId: "composer",
    composerThought: "",
  });
});

test("Continue is disabled until text is entered, then calls finishOnboarding", async () => {
  const finishOnboarding = jest.fn().mockResolvedValue({ status: "saved" });
  useOnboardingFlow.setState({ finishOnboarding });

  renderWithProviders(
    <I18nProvider locale="en">
      <ComposerStep />
    </I18nProvider>,
  );

  const continueButton = () =>
    screen.getByRole("button", { name: continueLabel });
  expect(continueButton().props.accessibilityState).toMatchObject({
    disabled: true,
  });

  fireEvent.changeText(
    screen.getByPlaceholderText(
      i18n.t("onboarding_screen.composer.placeholder"),
    ),
    "A new thought",
  );
  await waitFor(() =>
    expect(continueButton().props.accessibilityState).toMatchObject({
      disabled: false,
    }),
  );

  fireEvent.press(continueButton());
  expect(finishOnboarding).toHaveBeenCalledTimes(1);
});
