import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { TranslateFn } from "@/src/i18n/use-i18n";

const CHANNEL_ID = "default";

export interface ReminderTime {
  hour: number;
  minute: number;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.status !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_ID,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return true;
}

export async function scheduleDailyReminder(
  time: ReminderTime,
  t: TranslateFn,
): Promise<void> {
  await cancelScheduledReminders();

  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error("Notification permission denied");
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("reminder_notification.intro.title"),
      body: t("reminder_notification.intro.body"),
      color: "#F78FB3",
    },
    trigger: null,
  });
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("reminder_notification.1.title"),
      body: t("reminder_notification.1.body"),
      color: "#F78FB3",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: CHANNEL_ID,
      hour: time.hour,
      minute: time.minute,
    },
  });
}

export async function cancelScheduledReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function hasScheduledReminders(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length > 0;
}
