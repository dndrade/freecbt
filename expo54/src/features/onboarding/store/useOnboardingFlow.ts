import { DistortionData, Thought } from "@/model";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { getFeatureFlag } from "@/services";
import { zustandMmkvStorage } from "@/services/storage/zustandStorage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { situationIds, type SituationId } from "../content/situations";

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
const ONBOARDING_STEP_IDS = new Set<string>([
  ...PREFIX_ORDER,
  "reminders",
  "composer",
  ...GUIDED_ORDER,
]);
const RESTART_AFTER_MS = 24 * 60 * 60 * 1000;

function isKnownStepId(value: unknown): value is string {
  return typeof value === "string" && ONBOARDING_STEP_IDS.has(value);
}

function isKnownSituationId(value: unknown): value is SituationId {
  return (
    typeof value === "string" && situationIds.includes(value as SituationId)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isValidPersistedDraft(
  value: unknown,
): value is Partial<OnboardingDraft> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return (
    (state.currentStepId === undefined || isKnownStepId(state.currentStepId)) &&
    (state.history === undefined ||
      (isStringArray(state.history) && state.history.every(isKnownStepId))) &&
    (state.lastActiveAt === undefined ||
      typeof state.lastActiveAt === "string") &&
    (state.situation === undefined || isKnownSituationId(state.situation)) &&
    (state.revealed === undefined || typeof state.revealed === "boolean") &&
    (state.selectedDistortionSlugs === undefined ||
      isStringArray(state.selectedDistortionSlugs)) &&
    (state.selectedEvidenceIds === undefined ||
      isStringArray(state.selectedEvidenceIds)) &&
    (state.guidedAlternative === undefined ||
      typeof state.guidedAlternative === "string") &&
    (state.guidedPersonalThought === undefined ||
      typeof state.guidedPersonalThought === "string") &&
    (state.composerThought === undefined ||
      typeof state.composerThought === "string") &&
    (state.hasCompletedGuidedPractice === undefined ||
      typeof state.hasCompletedGuidedPractice === "boolean")
  );
}

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
  if (
    current === "path" &&
    getFeatureFlag("enable_onboarding_reminders_step")
  ) {
    return "reminders";
  }
  if (current === "reminders") return "invitation";

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
      chooseSituation: (situation) =>
        set((state) =>
          state.situation === situation
            ? {}
            : {
                situation,
                revealed: false,
                selectedDistortionSlugs: [],
                selectedEvidenceIds: [],
                guidedAlternative: "",
                lastActiveAt: new Date().toISOString(),
              },
        ),
      reveal: () =>
        set((state) =>
          state.revealed
            ? {}
            : { revealed: true, lastActiveAt: new Date().toISOString() },
        ),
      toggleDistortion: (slug) =>
        set(({ selectedDistortionSlugs }) => ({
          selectedDistortionSlugs: selectedDistortionSlugs.includes(slug)
            ? selectedDistortionSlugs.filter((s) => s !== slug)
            : [...selectedDistortionSlugs, slug],
          lastActiveAt: new Date().toISOString(),
        })),
      toggleEvidence: (id) =>
        set(({ selectedEvidenceIds }) => ({
          selectedEvidenceIds: selectedEvidenceIds.includes(id)
            ? selectedEvidenceIds.filter((e) => e !== id)
            : [...selectedEvidenceIds, id],
          lastActiveAt: new Date().toISOString(),
        })),
      setGuidedAlternative: (guidedAlternative) =>
        set((state) =>
          state.guidedAlternative === guidedAlternative
            ? {}
            : { guidedAlternative, lastActiveAt: new Date().toISOString() },
        ),
      appendAlternativePhrase: (phrase) =>
        set(({ guidedAlternative }) => ({
          guidedAlternative: `${guidedAlternative}${guidedAlternative ? " " : ""}${phrase}.`,
          lastActiveAt: new Date().toISOString(),
        })),
      setGuidedPersonalThought: (guidedPersonalThought) =>
        set((state) =>
          state.guidedPersonalThought === guidedPersonalThought
            ? {}
            : {
                guidedPersonalThought,
                lastActiveAt: new Date().toISOString(),
              },
        ),
      setComposerThought: (composerThought) =>
        set((state) =>
          state.composerThought === composerThought
            ? {}
            : { composerThought, lastActiveAt: new Date().toISOString() },
        ),

      finishOnboarding: async () => {
        if (get().isSaving) return { status: "failed" };
        const state = get();
        const viaGuidedPractice = state.currentStepId === "g-your-turn";
        const finalThought = viaGuidedPractice
          ? state.guidedPersonalThought
          : state.currentStepId === "composer"
            ? state.composerThought
            : "";
        const spec: Thought.Spec = {
          automaticThought: finalThought,
          cognitiveDistortions: new Set(),
          challenge: "",
          alternativeThought: "",
        };
        const hasThought = Thought.isMeaningfulSpec(spec);

        set({ isSaving: true, error: null });
        try {
          const thought = hasThought ? Thought.create(spec, new Date()) : null;
          if (thought) {
            await thoughtsService(
              DistortionData,
              await ensureThoughtRecordReady(),
            ).write(thought);
          }
          useSettings.getState().completeOnboarding();
          set({
            ...initialDraft,
            lastActiveAt: new Date().toISOString(),
            hasCompletedGuidedPractice:
              (hasThought && viaGuidedPractice) ||
              get().hasCompletedGuidedPractice,
            isSaving: false,
          });
          return thought ? { status: "saved", thought } : { status: "empty" };
        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return { status: "failed" };
        }
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
  if (persistedState === undefined || persistedState === null) {
    return currentState;
  }
  const completedGuidedPractice =
    typeof (persistedState as { hasCompletedGuidedPractice?: unknown })
      .hasCompletedGuidedPractice === "boolean"
      ? (persistedState as { hasCompletedGuidedPractice: boolean })
          .hasCompletedGuidedPractice
      : currentState.hasCompletedGuidedPractice;
  const restart = () => ({
    ...currentState,
    hasCompletedGuidedPractice: completedGuidedPractice,
  });
  if (!isValidPersistedDraft(persistedState)) return restart();

  const persisted = durableDraft(persistedState);
  if (!persisted || typeof persisted.lastActiveAt !== "string") {
    return restart();
  }
  const elapsedMs = Date.now() - new Date(persisted.lastActiveAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs >= RESTART_AFTER_MS) {
    return restart();
  }
  return { ...currentState, ...persisted };
}

export function initializeOnboardingFlow(): Promise<void> {
  return Promise.resolve(useOnboardingFlow.persist.rehydrate());
}
