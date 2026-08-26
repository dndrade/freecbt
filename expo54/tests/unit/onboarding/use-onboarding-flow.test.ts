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
  useOnboardingFlow.setState(initial);
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

test("changing situation after going back clears situation-derived readiness before going forward", () => {
  useOnboardingFlow.setState({
    currentStepId: "g-alternative",
    history: [
      "invitation",
      "g-situation",
      "g-thought",
      "g-pattern",
      "g-evidence",
    ],
    situation: "interview",
    revealed: true,
    selectedDistortionSlugs: ["fortune-telling"],
    selectedEvidenceIds: [
      "onboarding_screen.guided.situations.interview.evidence_1",
    ],
    guidedAlternative: "I can handle this",
  });

  useOnboardingFlow.getState().back();
  useOnboardingFlow.getState().back();
  useOnboardingFlow.getState().back();
  useOnboardingFlow.getState().back();
  expect(useOnboardingFlow.getState().currentStepId).toBe("g-situation");

  useOnboardingFlow.getState().chooseSituation("message");
  useOnboardingFlow.getState().next();

  expect(useOnboardingFlow.getState()).toMatchObject({
    currentStepId: "g-thought",
    situation: "message",
    revealed: false,
    selectedDistortionSlugs: [],
    selectedEvidenceIds: [],
    guidedAlternative: "",
  });
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

test.each([
  [
    "situation changes",
    () => useOnboardingFlow.getState().chooseSituation("message"),
  ],
  ["thought reveals", () => useOnboardingFlow.getState().reveal()],
  [
    "distortion selections",
    () => useOnboardingFlow.getState().toggleDistortion("labeling"),
  ],
  [
    "evidence selections",
    () => useOnboardingFlow.getState().toggleEvidence("evidence-1"),
  ],
  [
    "alternative edits",
    () => useOnboardingFlow.getState().setGuidedAlternative("Balanced"),
  ],
  [
    "alternative phrase selections",
    () => useOnboardingFlow.getState().appendAlternativePhrase("Maybe"),
  ],
  [
    "guided draft edits",
    () => useOnboardingFlow.getState().setGuidedPersonalThought("Guided"),
  ],
  [
    "composer draft edits",
    () => useOnboardingFlow.getState().setComposerThought("Quick"),
  ],
] as const)("%s refresh lastActiveAt", (_name, mutate) => {
  useOnboardingFlow.setState({ lastActiveAt: "2000-01-01T00:00:00.000Z" });

  mutate();

  expect(useOnboardingFlow.getState().lastActiveAt).not.toBe(
    "2000-01-01T00:00:00.000Z",
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

test.each([
  ["unknown current step", { currentStepId: "missing-step" }],
  ["unknown situation", { situation: "missing-situation" }],
  ["unknown history step", { history: ["welcome", "missing-step"] }],
  [
    "non-string distortion selection",
    { selectedDistortionSlugs: ["labeling", 7] },
  ],
  [
    "non-string evidence selection",
    { selectedEvidenceIds: ["evidence-1", null] },
  ],
] as const)(
  "mergeOnboardingFlowState safely restarts for %s",
  (_name, invalid) => {
    const current = {
      ...initial,
      currentStepId: "welcome",
      hasCompletedGuidedPractice: false,
    } as never;
    const merged = mergeOnboardingFlowState(
      {
        currentStepId: "g-pattern",
        history: [
          "welcome",
          "privacy",
          "path",
          "invitation",
          "g-situation",
          "g-thought",
        ],
        lastActiveAt: new Date().toISOString(),
        situation: "interview",
        revealed: true,
        selectedDistortionSlugs: ["labeling"],
        selectedEvidenceIds: ["evidence-1"],
        guidedAlternative: "A balanced view",
        guidedPersonalThought: "My thought",
        composerThought: "Quick thought",
        hasCompletedGuidedPractice: true,
        ...invalid,
      },
      current,
    );

    expect(merged).toMatchObject({
      currentStepId: "welcome",
      history: [],
      situation: "interview",
      revealed: false,
      selectedDistortionSlugs: [],
      selectedEvidenceIds: [],
      guidedAlternative: "",
      hasCompletedGuidedPractice: true,
    });
  },
);

test("finishOnboarding writes a Thought with the guided draft, saves, and completes onboarding", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();

  useOnboardingFlow.setState({ currentStepId: "g-your-turn" });
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

  useOnboardingFlow.setState({ currentStepId: "composer" });
  useOnboardingFlow.getState().setComposerThought("Quick draft");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result.status).toBe("saved");
  expect(useOnboardingFlow.getState().hasCompletedGuidedPractice).toBe(false);
});

test("finishOnboarding completes settings without writing a Thought when the visible draft is empty", async () => {
  const result = await useOnboardingFlow.getState().finishOnboarding();
  expect(result).toEqual({ status: "empty" });
  expect(write).not.toHaveBeenCalled();
  expect(completeOnboardingMock()).toHaveBeenCalledTimes(1);
});

test("finishOnboarding saves the guided draft after switching from quick to guided", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();
  useOnboardingFlow.setState({
    currentStepId: "composer",
    history: ["invitation"],
    composerThought: "Hidden quick draft",
  });

  useOnboardingFlow.getState().back();
  useOnboardingFlow.getState().goTo("g-situation");
  for (let step = 0; step < 6; step += 1) {
    useOnboardingFlow.getState().next();
  }
  useOnboardingFlow.getState().setGuidedPersonalThought("Visible guided draft");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result.status).toBe("saved");
  if (result.status === "saved") {
    expect(result.thought.automaticThought).toBe("Visible guided draft");
  }
});

test("finishOnboarding saves the composer draft after switching from guided to quick", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();
  useOnboardingFlow.setState({
    currentStepId: "g-your-turn",
    history: ["invitation"],
    guidedPersonalThought: "Hidden guided draft",
  });

  useOnboardingFlow.getState().back();
  useOnboardingFlow.getState().goTo("composer");
  useOnboardingFlow.getState().setComposerThought("Visible quick draft");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result.status).toBe("saved");
  if (result.status === "saved") {
    expect(result.thought.automaticThought).toBe("Visible quick draft");
  }
});

test("finishOnboarding keeps the draft and reports failure when the write rejects", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  const failure = new Error("disk full");
  write.mockRejectedValueOnce(failure);

  useOnboardingFlow.setState({ currentStepId: "composer" });
  useOnboardingFlow.getState().setComposerThought("keep me");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result).toEqual({ status: "failed" });
  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "keep me",
    isSaving: false,
    error: failure,
  });
});

test("finishOnboarding keeps the draft and reports failure when settings completion throws", async () => {
  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();
  const failure = new Error("settings unavailable");
  completeOnboardingMock().mockImplementationOnce(() => {
    throw failure;
  });

  useOnboardingFlow.setState({ currentStepId: "composer" });
  useOnboardingFlow.getState().setComposerThought("keep me too");
  const result = await useOnboardingFlow.getState().finishOnboarding();

  expect(result).toEqual({ status: "failed" });
  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "keep me too",
    isSaving: false,
    error: failure,
  });
});

test("initializeOnboardingFlow excludes transient state so a persisted draft can retry", async () => {
  useOnboardingFlow.setState({
    isSaving: true,
    error: new Error("stale save"),
  });
  useOnboardingFlow.getState().setComposerThought("retry me");
  const persisted = values.get(ONBOARDING_STORE_NAME);

  useOnboardingFlow.setState(initial);
  values.set(ONBOARDING_STORE_NAME, persisted!);
  await initializeOnboardingFlow();

  expect(useOnboardingFlow.getState()).toMatchObject({
    composerThought: "retry me",
    isSaving: false,
    error: null,
  });

  const { ensureThoughtRecordReady } = jest.requireMock(
    "@/features/thoughtRecord/services/ensureThoughtRecordReady",
  ) as { ensureThoughtRecordReady: jest.Mock };
  ensureThoughtRecordReady.mockResolvedValueOnce({});
  write.mockResolvedValueOnce();
  useOnboardingFlow.setState({ currentStepId: "composer" });

  await expect(
    useOnboardingFlow.getState().finishOnboarding(),
  ).resolves.toMatchObject({
    status: "saved",
  });
});
