import {
  initializeOnboardingFlow,
  mergeOnboardingFlowState,
  ONBOARDING_STORE_NAME,
  useOnboardingFlow,
} from "@/features/onboarding/store/useOnboardingFlow";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useFeatureFlagStore } from "@/services";

const values = new Map<string, string>();
const write = jest.fn<Promise<void>, [unknown]>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ write })),
}));
jest.mock("@/features/settings/hooks/useSettings", () => {
  const completeOnboarding = jest.fn();
  const getState = jest.fn(() => ({ completeOnboarding }));
  return { useSettings: Object.assign(jest.fn(), { getState }) };
});

function completeOnboardingMock() {
  return (
    useSettings as unknown as {
      getState: () => { completeOnboarding: jest.Mock };
    }
  ).getState().completeOnboarding;
}

const initial = {
  currentStepId: "welcome",
  history: [] as string[],
  lastActiveAt: new Date().toISOString(),
  situation: "interview" as const,
  revealed: false,
  selectedDistortionSlugs: [] as string[],
  selectedEvidenceIds: [] as string[],
  guidedAlternative: "",
  guidedPersonalThought: "",
  composerThought: "",
  hasCompletedGuidedPractice: false,
  isSaving: false,
  error: null,
};

beforeEach(() => {
  useFeatureFlagStore.getState().resetFlags();
  useOnboardingFlow.setState({
    ...initial,
    activeIndex: 0,
    completion: "idle",
    reminderChoice: null,
  });
  values.clear();
  jest.clearAllMocks();
});

test("next() walks the shared prefix in order", () => {
  const s = useOnboardingFlow.getState();
  expect(s.currentStepId).toBe("welcome");
  s.next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("privacy");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("path");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("invitation");
});

test("next() routes through reminders when its feature flag is enabled", () => {
  useFeatureFlagStore
    .getState()
    .overrideFlags({ enable_onboarding_reminders_step: true });
  useOnboardingFlow.setState({
    currentStepId: "path",
    history: ["welcome", "privacy"],
  });

  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("reminders");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("invitation");
});

test("back() pops history and is a no-op at welcome", () => {
  useOnboardingFlow.getState().next();
  useOnboardingFlow.getState().next();
  useOnboardingFlow.getState().back();
  expect(useOnboardingFlow.getState().currentStepId).toBe("privacy");
  useOnboardingFlow.getState().back();
  expect(useOnboardingFlow.getState().currentStepId).toBe("welcome");
  useOnboardingFlow.getState().back();
  expect(useOnboardingFlow.getState().currentStepId).toBe("welcome");
});

test("the guided sub-sequence advances step by step", () => {
  useOnboardingFlow.setState({ currentStepId: "g-situation" });
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-thought");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-pattern");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-evidence");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-alternative");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-complete");
  useOnboardingFlow.getState().next();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-your-turn");
});

test("chooseSituation, toggleDistortion, and toggleEvidence are reversible", () => {
  useOnboardingFlow.getState().chooseSituation("message");
  expect(useOnboardingFlow.getState().situation).toBe("message");

  useOnboardingFlow.getState().toggleDistortion("mind-reading");
  expect(useOnboardingFlow.getState().selectedDistortionSlugs).toEqual([
    "mind-reading",
  ]);
  useOnboardingFlow.getState().toggleDistortion("mind-reading");
  expect(useOnboardingFlow.getState().selectedDistortionSlugs).toEqual([]);

  useOnboardingFlow.getState().toggleEvidence("paused");
  expect(useOnboardingFlow.getState().selectedEvidenceIds).toEqual(["paused"]);
  useOnboardingFlow.getState().toggleEvidence("paused");
  expect(useOnboardingFlow.getState().selectedEvidenceIds).toEqual([]);
});

test("reveal() is one-way and appendAlternativePhrase appends, not replaces", () => {
  useOnboardingFlow.getState().reveal();
  expect(useOnboardingFlow.getState().revealed).toBe(true);

  useOnboardingFlow.getState().setGuidedAlternative("I tried my best");
  useOnboardingFlow
    .getState()
    .appendAlternativePhrase("one moment doesn't decide the outcome");
  expect(useOnboardingFlow.getState().guidedAlternative).toBe(
    "I tried my best one moment doesn't decide the outcome.",
  );
});

test("skip() clears history", () => {
  useOnboardingFlow.getState().next();
  useOnboardingFlow.getState().next();
  useOnboardingFlow.getState().skip();
  expect(useOnboardingFlow.getState().history).toEqual([]);
});

test("mergeOnboardingFlowState resumes when lastActiveAt is under a day old", () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const merged = mergeOnboardingFlowState(
    {
      currentStepId: "g-pattern",
      lastActiveAt: twoHoursAgo,
      selectedDistortionSlugs: ["labeling"],
    },
    { ...initial, currentStepId: "welcome" } as never,
  );
  expect(merged.currentStepId).toBe("g-pattern");
  expect(merged.selectedDistortionSlugs).toEqual(["labeling"]);
});

test("mergeOnboardingFlowState restarts when lastActiveAt is a day or more old, keeping hasCompletedGuidedPractice", () => {
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const merged = mergeOnboardingFlowState(
    {
      currentStepId: "g-pattern",
      lastActiveAt: twoDaysAgo,
      selectedDistortionSlugs: ["labeling"],
      hasCompletedGuidedPractice: true,
    },
    {
      ...initial,
      currentStepId: "welcome",
      hasCompletedGuidedPractice: false,
    } as never,
  );
  expect(merged.currentStepId).toBe("welcome");
  expect(merged.selectedDistortionSlugs).toEqual([]);
  expect(merged.hasCompletedGuidedPractice).toBe(true);
});

test("mergeOnboardingFlowState falls back to current state when nothing was ever persisted", () => {
  const current = { ...initial, currentStepId: "welcome" } as never;
  expect(mergeOnboardingFlowState(undefined, current)).toBe(current);
});

test("finishOnboarding writes a Thought with the guided draft, saves, and completes onboarding", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();

  useOnboardingFlow.getState().setGuidedPersonalThought("I can start small");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result.status).toBe("saved");
  if (result.status === "saved") {
    expect(result.thought.automaticThought).toBe("I can start small");
    expect(result.thought.cognitiveDistortions.size).toBe(0);
  }
  expect(write).toHaveBeenCalledTimes(1);
  expect(completeOnboardingMock()).toHaveBeenCalledTimes(1);
  expect(useOnboardingFlow.getState()).toMatchObject({
    currentStepId: "welcome",
    guidedPersonalThought: "",
    hasCompletedGuidedPractice: true,
    isSaving: false,
  });
});

test("finishOnboarding prefers the composer draft when there is no guided draft, and does not set hasCompletedGuidedPractice", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();

  useOnboardingFlow.getState().setComposerThought("Quick draft");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result.status).toBe("saved");
  expect(useOnboardingFlow.getState().hasCompletedGuidedPractice).toBe(false);
});

test("finishOnboarding writes nothing when both drafts are empty", async () => {
  const result = await useOnboardingFlow.getState().finishOnboarding();
  expect(result).toEqual({ status: "empty" });
  expect(write).not.toHaveBeenCalled();
  expect(completeOnboardingMock()).not.toHaveBeenCalled();
});

test("finishOnboarding keeps the draft and reports failure when the write rejects", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  const failure = new Error("disk full");
  write.mockRejectedValueOnce(failure);

  useOnboardingFlow.getState().setComposerThought("keep me");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result).toEqual({ status: "failed" });
  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "keep me",
    isSaving: false,
    error: failure,
  });
});

test("finishOnboarding keeps the draft and reports failure when settings completion rejects", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();
  const failure = new Error("settings unavailable");
  completeOnboardingMock().mockRejectedValueOnce(failure);

  useOnboardingFlow.getState().setComposerThought("keep me too");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result).toEqual({ status: "failed" });
  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "keep me too",
    isSaving: false,
    error: failure,
  });
});

test("initializeOnboardingFlow excludes transient and legacy state so a persisted draft can retry", async () => {
  useOnboardingFlow.setState({
    isSaving: true,
    error: new Error("stale save"),
    activeIndex: 2,
    completion: "saving",
    reminderChoice: "enabled",
  });
  useOnboardingFlow.getState().setComposerThought("retry me");
  const persisted = values.get(ONBOARDING_STORE_NAME);

  useOnboardingFlow.setState({
    ...initial,
    activeIndex: 0,
    completion: "idle",
    reminderChoice: null,
  });
  values.set(ONBOARDING_STORE_NAME, persisted!);
  await initializeOnboardingFlow();

  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "retry me",
    isSaving: false,
    error: null,
    activeIndex: 0,
    completion: "idle",
    reminderChoice: null,
  });

  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();

  await expect(
    useOnboardingFlow.getState().finishOnboarding(),
  ).resolves.toMatchObject({
    status: "saved",
  });
});
