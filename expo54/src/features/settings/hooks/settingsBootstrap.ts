import AsyncStorage from "@react-native-async-storage/async-storage";
import { zustandMmkvStorage } from "@/services/storage/zustandStorage";
import {
  PublicSettingsSchema,
  readLegacyPublicSettings,
} from "../data/settingsStorage";
import { SETTINGS_STORE_NAME, useSettings } from "./useSettings";

let inFlight: Promise<void> | null = null;

function readValidPersistedSettings() {
  // zustandMmkvStorage's real implementation is synchronous; StateStorage's
  // type is broader to allow async storages, so narrow it here at runtime.
  const raw = zustandMmkvStorage.getItem(SETTINGS_STORE_NAME);
  if (typeof raw !== "string") return null;
  let envelope: { state?: { settings?: unknown } };
  try {
    envelope = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = PublicSettingsSchema.safeParse(envelope.state?.settings);
  return parsed.success ? parsed.data : null;
}

// This is the only settings-feature path that reads legacy AsyncStorage or
// raw MMKV. The root layout awaits it before mounting the app providers.
export async function runSettingsBootstrap(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const persisted = readValidPersistedSettings();
      if (persisted) {
        await useSettings.persist.rehydrate();
      } else {
        const legacy = await readLegacyPublicSettings(AsyncStorage);
        // Rehydrate before seeding: an empty/invalid MMKV read merges defaults.
        // Reversing these lines would overwrite the recovered legacy slice.
        await useSettings.persist.rehydrate();
        useSettings.setState({ settings: legacy });
      }
    } catch (err) {
      console.warn("Settings bootstrap failed, using defaults:", err);
      // The store is constructed with public defaults. Do not call setState
      // here: persist would write those defaults to MMKV and suppress the
      // recoverable legacy migration on the next attempt.
    }
  })();

  try {
    await inFlight;
  } finally {
    // A rejected or caught failure must never leave a poisoned cached promise.
    inFlight = null;
  }
}
