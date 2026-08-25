import { Platform } from "react-native";
import { useSettings } from "@/src/features/settings/hooks/useSettings";
import type { TranslateFn } from "@/src/i18n/use-i18n";
import {
  cancelScheduledReminders,
  scheduleDailyReminder,
  type ReminderTime,
} from "./services/reminderScheduler";

export type Reminders = ReturnType<typeof useReminders>;

// v1 code's reminder-support check.
// as of 2025/12, expo-notifications doesn't support web: https://docs.expo.dev/guides/using-push-notifications-services/#tips-and-important-considerations
// TODO: not sure why android wasn't enabled, but wait til the big v2 release is done to enable it
export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 20, minute: 0 };

export function useReminders() {
  const enabled = useSettings((s) => s.settings.reminders);
  const setReminders = useSettings((s) => s.setReminders);

  return {
    isSupported: () => Platform.OS === "ios",
    enabled,
    async enableReminders(
      time: ReminderTime = DEFAULT_REMINDER_TIME,
      t: TranslateFn,
    ) {
      await scheduleDailyReminder(time, t);
      setReminders(true);
    },
    async disableReminders() {
      await cancelScheduledReminders();
      setReminders(false);
    },
    async updateReminderTime(time: ReminderTime, t: TranslateFn) {
      if (!enabled) return;
      await scheduleDailyReminder(time, t);
    },
  } as const;
}
