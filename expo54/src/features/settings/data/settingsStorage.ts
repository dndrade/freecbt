import { Settings } from "@/model";
import type { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { z } from "zod";

export const PublicSettingsSchema = Settings.Settings.pick({
  locale: true,
  reminders: true,
  existingUser: true,
});
export type PublicSettings = z.infer<typeof PublicSettingsSchema>;

// Read-only: never touches SecureStore or writes to AsyncStorage. Safe to
// call repeatedly as the settings bootstrap step's one-time migration source.
export async function readLegacyPublicSettings(
  storage: AsyncStorageStatic,
): Promise<PublicSettings> {
  const batch = await storage.multiGet([
    Settings.localeKey,
    Settings.remindersKey,
    Settings.existingUserKey,
  ]);
  const decoded = Settings.fromJson.parse({
    ...Object.fromEntries(batch),
    [Settings.pincodeKey]: null,
    [Settings.themeKey]: null,
    [Settings.historyLabelsKey]: null,
  });
  return {
    locale: decoded.locale,
    reminders: decoded.reminders,
    existingUser: decoded.existingUser,
  };
}
