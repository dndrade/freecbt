const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

jest.mock("@/features/reminders/services/reminderScheduler", () => ({
  scheduleDailyReminder: jest.fn(),
  cancelScheduledReminders: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react-native";
import { useSettings } from "@/features/settings/hooks/useSettings";
import {
  DEFAULT_REMINDER_TIME,
  useReminders,
} from "@/features/reminders/use-reminders";
import {
  scheduleDailyReminder,
  cancelScheduledReminders,
} from "@/features/reminders/services/reminderScheduler";
import type { TranslateFn } from "@/i18n/use-i18n";

const translate = ((key: string) => key) as TranslateFn;

beforeEach(() => {
  values.clear();
  jest.clearAllMocks();
  useSettings.setState({
    settings: {
      locale: null,
      reminders: false,
      existingUser: false,
      theme: null,
    },
  });
});

test("enableReminders schedules the notification and persists the setting", async () => {
  const { result } = renderHook(() => useReminders());

  await act(async () => {
    await result.current.enableReminders(undefined, translate);
  });

  expect(scheduleDailyReminder).toHaveBeenCalledWith(
    DEFAULT_REMINDER_TIME,
    translate,
  );
  expect(useSettings.getState().settings.reminders).toBe(true);
});

test("disableReminders cancels the notification and persists the setting", async () => {
  useSettings.setState((s) => ({
    settings: { ...s.settings, reminders: true },
  }));
  const { result } = renderHook(() => useReminders());

  await act(async () => {
    await result.current.disableReminders();
  });

  expect(cancelScheduledReminders).toHaveBeenCalled();
  expect(useSettings.getState().settings.reminders).toBe(false);
});

test("enableReminders does not persist the setting when scheduling fails", async () => {
  jest
    .mocked(scheduleDailyReminder)
    .mockRejectedValueOnce(new Error("Notification permission denied"));
  const { result } = renderHook(() => useReminders());

  await act(async () => {
    await expect(
      result.current.enableReminders(undefined, translate),
    ).rejects.toThrow("Notification permission denied");
  });

  expect(useSettings.getState().settings.reminders).toBe(false);
});

test("updateReminderTime reschedules only when reminders are enabled", async () => {
  const { result, rerender } = renderHook(() => useReminders());

  await act(async () => {
    await result.current.updateReminderTime({ hour: 7, minute: 30 }, translate);
  });
  expect(scheduleDailyReminder).not.toHaveBeenCalled();

  act(() => {
    useSettings.setState((s) => ({
      settings: { ...s.settings, reminders: true },
    }));
  });
  rerender({});

  await act(async () => {
    await result.current.updateReminderTime({ hour: 7, minute: 30 }, translate);
  });
  expect(scheduleDailyReminder).toHaveBeenCalledWith(
    { hour: 7, minute: 30 },
    translate,
  );
});
