import * as Notifications from "expo-notifications";
import {
  cancelScheduledReminders,
  hasScheduledReminders,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from "@/features/reminders/services/reminderScheduler";
import type { TranslateFn } from "@/i18n/use-i18n";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));

const translate = ((key: string) => key) as TranslateFn;

beforeEach(() => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    status: "granted",
  } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    status: "granted",
  } as Notifications.NotificationPermissionsStatus);
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("requestNotificationPermissions", () => {
  it("returns true when permission is already granted", async () => {
    await expect(requestNotificationPermissions()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests permission when not already granted", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "undetermined",
    } as Notifications.NotificationPermissionsStatus);

    await expect(requestNotificationPermissions()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it("returns false when permission is denied", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "undetermined",
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as Notifications.NotificationPermissionsStatus);

    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });
});

describe("scheduleDailyReminder", () => {
  it("cancels existing reminders, then schedules an intro and a daily notification", async () => {
    await scheduleDailyReminder({ hour: 20, minute: 0 }, translate);

    expect(
      Notifications.cancelAllScheduledNotificationsAsync,
    ).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: "daily",
          hour: 20,
          minute: 0,
        }),
      }),
    );
  });

  it("throws and does not schedule when permission is denied", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as Notifications.NotificationPermissionsStatus);

    await expect(
      scheduleDailyReminder({ hour: 20, minute: 0 }, translate),
    ).rejects.toThrow("Notification permission denied");

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe("cancelScheduledReminders", () => {
  it("cancels all scheduled notifications", async () => {
    await cancelScheduledReminders();
    expect(
      Notifications.cancelAllScheduledNotificationsAsync,
    ).toHaveBeenCalled();
  });
});

describe("hasScheduledReminders", () => {
  it("returns false when nothing is scheduled", async () => {
    await expect(hasScheduledReminders()).resolves.toBe(false);
  });

  it("returns true when notifications are scheduled", async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        { identifier: "1" },
      ] as Notifications.NotificationRequest[]);

    await expect(hasScheduledReminders()).resolves.toBe(true);
  });
});
