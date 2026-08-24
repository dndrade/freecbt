import { create } from "zustand";
import { useSettings } from "@/src/features/settings/hooks/useSettings";

export type OnboardingCompletion =
  | "idle"
  | "saving"
  | { status: "failure"; error: string };

export interface OnboardingFlowState {
  activeIndex: number;
  completion: OnboardingCompletion;
  reminderChoice: "enabled" | "disabled" | null;
  setActiveIndex: (index: number) => void;
  setReminderChoice: (choice: "enabled" | "disabled") => void;
  finish: () => Promise<void>;
}

export const useOnboardingFlow = create<OnboardingFlowState>((set) => ({
  activeIndex: 0,
  completion: "idle",
  reminderChoice: null,

  setActiveIndex: (index) => set({ activeIndex: index }),
  setReminderChoice: (choice) => set({ reminderChoice: choice }),

  finish: async () => {
    set({ completion: "saving" });
    try {
      await useSettings.getState().completeOnboarding();
      set({ completion: "idle" });
    } catch (err) {
      set({
        completion: {
          status: "failure",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  },
}));
