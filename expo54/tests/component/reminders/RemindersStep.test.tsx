import React from "react";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { I18nProvider } from "@/i18n/use-i18n";
import { RemindersStep } from "@/features/onboarding/steps/RemindersStep";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import {
  useReminders,
  type Reminders,
} from "@/features/reminders/use-reminders";

jest.mock("@/features/reminders/use-reminders", () => ({
  useReminders: jest.fn(),
}));

function makeReminders(overrides: Partial<Reminders> = {}): Reminders {
  return {
    isSupported: () => true,
    enabled: false,
    enableReminders: jest.fn(),
    disableReminders: jest.fn(),
    updateReminderTime: jest.fn(),
    ...overrides,
  } as Reminders;
}

function renderStep(reminders: Reminders) {
  jest.mocked(useReminders).mockReturnValue(reminders);
  useOnboardingFlow.setState({
    currentStepId: "reminders",
    history: ["welcome", "privacy", "path", "invitation"],
  });

  return renderWithProviders(
    <I18nProvider locale="en">
      <RemindersStep />
    </I18nProvider>,
  );
}

test("enabling reminders advances only after enabling completes", async () => {
  let resolveEnable: () => void = () => undefined;
  const reminders = makeReminders({
    enableReminders: jest.fn(
      () => new Promise<void>((resolve) => (resolveEnable = resolve)),
    ),
  });
  const next = jest.fn();
  useOnboardingFlow.setState({ next });
  renderStep(reminders);

  fireEvent.press(screen.getByText("Yes please!"));

  expect(reminders.enableReminders).toHaveBeenCalledWith(
    undefined,
    expect.any(Function),
  );
  expect(reminders.disableReminders).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();

  await act(async () => resolveEnable());

  expect(next).toHaveBeenCalledTimes(1);
});

test("declining reminders advances only after disabling completes", async () => {
  let resolveDisable: () => void = () => undefined;
  const reminders = makeReminders({
    disableReminders: jest.fn(
      () => new Promise<void>((resolve) => (resolveDisable = resolve)),
    ),
  });
  const next = jest.fn();
  useOnboardingFlow.setState({ next });
  renderStep(reminders);

  fireEvent.press(screen.getByText("Continue without reminders"));

  expect(reminders.disableReminders).toHaveBeenCalled();
  expect(reminders.enableReminders).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();

  await act(async () => resolveDisable());

  expect(next).toHaveBeenCalledTimes(1);
});
