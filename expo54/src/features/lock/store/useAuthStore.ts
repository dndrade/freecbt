import { create } from "zustand";

export const useAuthStore = create<{
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}>((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));
