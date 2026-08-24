import { Settings } from "@/src/model";
import type { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { z } from "zod";

export interface SettingsSecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export function settings(
  storage: AsyncStorageStatic,
  secureStorage: SettingsSecureStoreLike,
) {
  // Existing users may still have their pincode in AsyncStorage from
  // before this file started using SecureStore. Migrate it once, on the
  // first read after upgrading, then never touch the legacy key again.
  async function readPincode(): Promise<string | null> {
    const secure = await secureStorage.getItemAsync(Settings.pincodeSecureKey);
    if (secure !== null) return secure;
    const legacy = await storage.getItem(Settings.pincodeKey);
    if (legacy !== null) {
      try {
        await secureStorage.setItemAsync(Settings.pincodeSecureKey, legacy);
        await storage.removeItem(Settings.pincodeKey);
      } catch {
        // secure write failed — leave the legacy key in place so migration can retry later
      }
    }
    return legacy;
  }
  async function read(): Promise<Settings.Settings> {
    const [batch, pincode] = await Promise.all([
      storage.multiGet(Settings.batchKeys),
      readPincode(),
    ]);
    const json = {
      ...Object.fromEntries(batch),
      [Settings.pincodeKey]: pincode,
    };
    return Settings.fromJson.parse(json);
  }
  async function write(s: Settings.Settings): Promise<void> {
    const json = Settings.fromJson.encode(s);
    const { [Settings.pincodeKey]: pincode, ...rest } = json;
    const entries = Object.entries(rest);
    const removes = entries.filter(([, v]) => v === null).map(([k]) => k);
    const sets = entries.filter((p): p is [string, string] => p[1] !== null);
    await Promise.all([
      storage.multiRemove(removes),
      storage.multiSet(sets),
      pincode === null
        ? secureStorage.deleteItemAsync(Settings.pincodeSecureKey)
        : secureStorage.setItemAsync(Settings.pincodeSecureKey, pincode),
    ]);
  }
  async function clear() {
    await Promise.all([
      storage.multiRemove(Settings.keys),
      secureStorage.deleteItemAsync(Settings.pincodeSecureKey),
    ]);
  }
  return { read, write, clear };
}

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
