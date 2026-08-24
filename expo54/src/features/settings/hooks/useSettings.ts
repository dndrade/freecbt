import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMmkvStorage } from "@/services/storage/zustandStorage";
import { empty as emptySettings } from "@/model/settings";
import {
  PublicSettingsSchema,
  type PublicSettings,
} from "../data/settingsStorage";

export const SETTINGS_STORE_NAME = "@SettingsStore:v1";

const defaults = emptySettings();
export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  locale: defaults.locale,
  reminders: defaults.reminders,
  existingUser: defaults.existingUser,
  theme: defaults.theme,
};

export interface SettingsState {
  settings: PublicSettings;
  setLocale: (locale: PublicSettings["locale"]) => void;
  setReminders: (reminders: boolean) => void;
  setTheme: (theme: PublicSettings["theme"]) => void;
  completeOnboarding: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_PUBLIC_SETTINGS,
      setLocale: (locale) =>
        set((s) => ({ settings: { ...s.settings, locale } })),
      setReminders: (reminders) =>
        set((s) => ({ settings: { ...s.settings, reminders } })),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      completeOnboarding: () =>
        set((s) => ({ settings: { ...s.settings, existingUser: true } })),
    }),
    {
      name: SETTINGS_STORE_NAME,
      storage: createJSONStorage(() => zustandMmkvStorage),
      // skipHydration means persist never reads MMKV on its own -- the only
      // reader of MMKV/legacy AsyncStorage for this store is
      // runSettingsBootstrap() (settingsBootstrap.ts), invoked once from the
      // root layout before any real consumer can mount. This is what
      // makes it safe for this module to be imported arbitrarily early in
      // the bundle's import graph: import-time evaluation of this file
      // never touches storage.
      skipHydration: true,
      partialize: ({ settings }) => ({ settings }),
      merge: (persistedState, currentState) => {
        const settings = (persistedState as { settings?: unknown } | undefined)
          ?.settings;
        // No MMKV record at all (fresh install, or nothing set yet) is not
        // corruption -- only warn when a persisted slice exists but fails
        // to parse.
        if (settings === undefined) {
          return currentState;
        }
        const parsed = PublicSettingsSchema.safeParse(settings);
        if (!parsed.success) {
          console.warn("Discarding invalid persisted settings:", parsed.error);
        }
        return {
          ...currentState,
          settings: parsed.success ? parsed.data : currentState.settings,
        };
      },
    },
  ),
);
