import { create } from "zustand";
import { migrateLegacyPinIfNeeded } from "../services/legacyPinMigration";
import * as pinStorage from "../services/pinStorage";

interface AuthState {
  isUnlocked: boolean;
  hasPin: boolean;
  isChecking: boolean;
  storageError: boolean;
  checkPinStatus: () => Promise<void>;
  verifyPin: (input: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  hasPin: false,
  isChecking: false,
  storageError: false,

  checkPinStatus: async () => {
    set({ isChecking: true, storageError: false });
    try {
      await migrateLegacyPinIfNeeded();
      set({ hasPin: await pinStorage.hasPin() });
    } catch {
      set({ hasPin: true, storageError: true });
    } finally {
      set({ isChecking: false });
    }
  },

  verifyPin: async (input) => {
    const stored = await pinStorage.getPin();
    const matches = stored !== null && stored === input;
    if (matches) set({ isUnlocked: true });
    return matches;
  },

  setPin: async (pin) => {
    await pinStorage.setPin(pin);
    set({ hasPin: true, isUnlocked: true });
  },

  removePin: async () => {
    await pinStorage.removePin();
    set({ hasPin: false, isUnlocked: true });
  },

  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
