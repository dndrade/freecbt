import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/tests/support/render";
import { I18nProvider, useTranslate } from "@/i18n/use-i18n";
import { RemindersStep } from "@/features/onboarding/steps/RemindersStep";
import type { Reminders } from "@/features/reminders/use-reminders";

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

function Harness({ reminders }: { reminders: Reminders }) {
  const translate = useTranslate();
  return <RemindersStep translate={translate} reminders={reminders} />;
}

function renderStep(reminders: Reminders) {
  return renderWithProviders(
    <I18nProvider locale="en">
      <Harness reminders={reminders} />
    </I18nProvider>,
  );
}

test("enabling reminders calls enableReminders with the default time", () => {
  const reminders = makeReminders();
  renderStep(reminders);

  fireEvent.press(screen.getByText("Yes please!"));

  expect(reminders.enableReminders).toHaveBeenCalledWith(
    undefined,
    expect.any(Function),
  );
  expect(reminders.disableReminders).not.toHaveBeenCalled();
});

test("declining reminders calls disableReminders", () => {
  const reminders = makeReminders();
  renderStep(reminders);

  fireEvent.press(screen.getByText("Continue without reminders"));

  expect(reminders.disableReminders).toHaveBeenCalled();
  expect(reminders.enableReminders).not.toHaveBeenCalled();
});
