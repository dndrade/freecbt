import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Storage } from "@/src";
import type { Settings } from "@/model/settings";
import { existingUserKey } from "@/model/settings";

const settingsStorage = Storage.settings(AsyncStorage, SecureStore);

export interface SettingsState {
  settings: Settings | null;
  isHydrated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  initialize: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setLocale: (locale: Settings["locale"]) => Promise<void>;
  setReminders: (reminders: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: null,
  isHydrated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const settings = await settingsStorage.read();
      set({ settings, isHydrated: true, isLoading: false });
    } catch (err) {
      console.warn("Failed to hydrate settings:", err);
      set({ isHydrated: true, isLoading: false });
    }
  },

  initialize: async () => {
    return get().hydrate();
  },

  updateSettings: async (patch) => {
    const current = get().settings;
    if (!current) return;
    const updated = { ...current, ...patch };
    set({ settings: updated });
    await settingsStorage.write(updated);
  },

  setLocale: async (locale) => {
    await get().updateSettings({ locale });
  },

  setReminders: async (reminders) => {
    await get().updateSettings({ reminders });
  },

  completeOnboarding: async () => {
    const current = get().settings;
    if (current) {
      const updated = { ...current, existingUser: true };
      set({ settings: updated });
      await settingsStorage.write(updated);
    }
    try {
      await AsyncStorage.setItem(existingUserKey, "true");
      await AsyncStorage.setItem("@Quirk:existing-user", "true");
    } catch (e) {
      console.warn("AsyncStorage existingUser sync error:", e);
    }
  },
}));
