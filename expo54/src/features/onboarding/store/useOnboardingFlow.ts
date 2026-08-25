import { DistortionData, Thought } from "@/model";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { zustandMmkvStorage } from "@/services/storage/zustandStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SituationId } from "../content/situations";

export const ONBOARDING_STORE_NAME = "onboarding:flow-session:v1";

const PREFIX_ORDER = ["welcome", "privacy", "path", "invitation"] as const;
const GUIDED_ORDER = [
  "g-situation",
  "g-thought",
  "g-pattern",
  "g-evidence",
  "g-alternative",
  "g-complete",
  "g-your-turn",
] as const;
const RESTART_AFTER_MS = 24 * 60 * 60 * 1000;

type OnboardingDraft = Pick<
  OnboardingFlowState,
  | "currentStepId"
  | "history"
  | "lastActiveAt"
  | "situation"
  | "revealed"
  | "selectedDistortionSlugs"
  | "selectedEvidenceIds"
  | "guidedAlternative"
  | "guidedPersonalThought"
  | "composerThought"
  | "hasCompletedGuidedPractice"
>;

function durableDraft(
  state: Partial<OnboardingFlowState>,
): Partial<OnboardingDraft> {
  return {
    ...(typeof state.currentStepId === "string" && {
      currentStepId: state.currentStepId,
    }),
    ...(Array.isArray(state.history) && { history: state.history }),
    ...(typeof state.lastActiveAt === "string" && {
      lastActiveAt: state.lastActiveAt,
    }),
    ...(typeof state.situation === "string" && { situation: state.situation }),
    ...(typeof state.revealed === "boolean" && { revealed: state.revealed }),
    ...(Array.isArray(state.selectedDistortionSlugs) && {
      selectedDistortionSlugs: state.selectedDistortionSlugs,
    }),
    ...(Array.isArray(state.selectedEvidenceIds) && {
      selectedEvidenceIds: state.selectedEvidenceIds,
    }),
    ...(typeof state.guidedAlternative === "string" && {
      guidedAlternative: state.guidedAlternative,
    }),
    ...(typeof state.guidedPersonalThought === "string" && {
      guidedPersonalThought: state.guidedPersonalThought,
    }),
    ...(typeof state.composerThought === "string" && {
      composerThought: state.composerThought,
    }),
    ...(typeof state.hasCompletedGuidedPractice === "boolean" && {
      hasCompletedGuidedPractice: state.hasCompletedGuidedPractice,
    }),
  };
}

function nextStepId(current: string): string {
  const prefixIndex = PREFIX_ORDER.indexOf(
    current as (typeof PREFIX_ORDER)[number],
  );
  if (prefixIndex !== -1 && prefixIndex < PREFIX_ORDER.length - 1) {
    return PREFIX_ORDER[prefixIndex + 1];
  }
  const guidedIndex = GUIDED_ORDER.indexOf(
    current as (typeof GUIDED_ORDER)[number],
  );
  if (guidedIndex !== -1 && guidedIndex < GUIDED_ORDER.length - 1) {
    return GUIDED_ORDER[guidedIndex + 1];
  }
  return current;
}

export type OnboardingCompletion =
  "idle" | "saving" | { status: "failure"; error: string };

export interface OnboardingFlowState {
  currentStepId: string;
  history: string[];
  lastActiveAt: string;
  situation: SituationId;
  revealed: boolean;
  selectedDistortionSlugs: string[];
  selectedEvidenceIds: string[];
  guidedAlternative: string;
  guidedPersonalThought: string;
  composerThought: string;
  hasCompletedGuidedPractice: boolean;
  isSaving: boolean;
  error: Error | null;
  next(): void;
  back(): void;
  skip(): void;
  goTo(stepId: string): void;
  chooseSituation(id: SituationId): void;
  reveal(): void;
  toggleDistortion(slug: string): void;
  toggleEvidence(id: string): void;
  setGuidedAlternative(text: string): void;
  appendAlternativePhrase(phrase: string): void;
  setGuidedPersonalThought(text: string): void;
  setComposerThought(text: string): void;
  finishOnboarding(): Promise<
    | { status: "saved"; thought: Thought.Thought }
    | { status: "empty" | "failed" }
  >;
  activeIndex: number;
  completion: OnboardingCompletion;
  reminderChoice: "enabled" | "disabled" | null;
  setActiveIndex(index: number): void;
  setReminderChoice(choice: "enabled" | "disabled"): void;
  finish(): Promise<void>;
}

const initialDraft = {
  currentStepId: "welcome",
  history: [] as string[],
  lastActiveAt: new Date().toISOString(),
  situation: "interview" as SituationId,
  revealed: false,
  selectedDistortionSlugs: [] as string[],
  selectedEvidenceIds: [] as string[],
  guidedAlternative: "",
  guidedPersonalThought: "",
  composerThought: "",
  isSaving: false,
  error: null as Error | null,
};

export const useOnboardingFlow = create<OnboardingFlowState>()(
  persist(
    (set, get) => ({
      ...initialDraft,
      hasCompletedGuidedPractice: false,
      activeIndex: 0,
      completion: "idle" as OnboardingCompletion,
      reminderChoice: null,

      goTo: (stepId) =>
        set(({ currentStepId, history }) => ({
          currentStepId: stepId,
          history: [...history, currentStepId],
          lastActiveAt: new Date().toISOString(),
        })),
      next: () =>
        set(({ currentStepId, history }) => ({
          currentStepId: nextStepId(currentStepId),
          history: [...history, currentStepId],
          lastActiveAt: new Date().toISOString(),
        })),
      back: () =>
        set(({ history }) => {
          if (history.length === 0) return {};
          const rest = history.slice(0, -1);
          return {
            currentStepId: history[history.length - 1],
            history: rest,
            lastActiveAt: new Date().toISOString(),
          };
        }),
      skip: () => set({ history: [], lastActiveAt: new Date().toISOString() }),
      chooseSituation: (situation) => set({ situation }),
      reveal: () => set({ revealed: true }),
      toggleDistortion: (slug) =>
        set(({ selectedDistortionSlugs }) => ({
          selectedDistortionSlugs: selectedDistortionSlugs.includes(slug)
            ? selectedDistortionSlugs.filter((s) => s !== slug)
            : [...selectedDistortionSlugs, slug],
        })),
      toggleEvidence: (id) =>
        set(({ selectedEvidenceIds }) => ({
          selectedEvidenceIds: selectedEvidenceIds.includes(id)
            ? selectedEvidenceIds.filter((e) => e !== id)
            : [...selectedEvidenceIds, id],
        })),
      setGuidedAlternative: (guidedAlternative) => set({ guidedAlternative }),
      appendAlternativePhrase: (phrase) =>
        set(({ guidedAlternative }) => ({
          guidedAlternative: `${guidedAlternative}${guidedAlternative ? " " : ""}${phrase}.`,
        })),
      setGuidedPersonalThought: (guidedPersonalThought) =>
        set({ guidedPersonalThought }),
      setComposerThought: (composerThought) => set({ composerThought }),

      finishOnboarding: async () => {
        if (get().isSaving) return { status: "failed" };
        const state = get();
        const finalThought = state.guidedPersonalThought.trim()
          ? state.guidedPersonalThought
          : state.composerThought;
        const spec: Thought.Spec = {
          automaticThought: finalThought,
          cognitiveDistortions: new Set(),
          challenge: "",
          alternativeThought: "",
        };
        if (!Thought.isMeaningfulSpec(spec)) return { status: "empty" };

        set({ isSaving: true, error: null });
        try {
          const thought = Thought.create(spec, new Date());
          await thoughtsService(
            DistortionData,
            await ensureThoughtRecordReady(),
          ).write(thought);
          await useSettings.getState().completeOnboarding();
          const viaGuidedPractice =
            state.guidedPersonalThought.trim().length > 0;
          set({
            ...initialDraft,
            lastActiveAt: new Date().toISOString(),
            hasCompletedGuidedPractice:
              viaGuidedPractice || get().hasCompletedGuidedPractice,
            isSaving: false,
          });
          return { status: "saved", thought };
        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return { status: "failed" };
        }
      },

      setActiveIndex: (activeIndex) => set({ activeIndex }),
      setReminderChoice: (reminderChoice) => set({ reminderChoice }),
      finish: async () => {
        set({ completion: "saving" });
        const result = await get().finishOnboarding();
        if (result.status === "failed") {
          set({
            completion: {
              status: "failure",
              error: get().error?.message ?? "Unable to save onboarding",
            },
          });
          return;
        }
        set({ completion: "idle" });
      },
    }),
    {
      name: ONBOARDING_STORE_NAME,
      storage: createJSONStorage(() => zustandMmkvStorage),
      skipHydration: true,
      partialize: durableDraft,
      merge: mergeOnboardingFlowState,
    },
  ),
);

export function mergeOnboardingFlowState(
  persistedState: unknown,
  currentState: OnboardingFlowState,
): OnboardingFlowState {
  const persisted = durableDraft(
    (persistedState as Partial<OnboardingFlowState> | undefined) ?? {},
  );
  if (!persisted || typeof persisted.lastActiveAt !== "string") {
    return currentState;
  }
  const elapsedMs = Date.now() - new Date(persisted.lastActiveAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs >= RESTART_AFTER_MS) {
    return {
      ...currentState,
      hasCompletedGuidedPractice:
        persisted.hasCompletedGuidedPractice ??
        currentState.hasCompletedGuidedPractice,
    };
  }
  return { ...currentState, ...persisted };
}

export function initializeOnboardingFlow(): Promise<void> {
  return Promise.resolve(useOnboardingFlow.persist.rehydrate());
}
