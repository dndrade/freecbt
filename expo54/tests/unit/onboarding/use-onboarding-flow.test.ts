import { useOnboardingFlow } from "@/src/features/onboarding/store/useOnboardingFlow";
import { useSettings } from "@/src/features/settings/hooks/useSettings";

jest.mock("@/src/features/settings/hooks/useSettings", () => {
  const completeOnboarding = jest.fn().mockResolvedValue(undefined);
  const getState = jest.fn(() => ({ completeOnboarding }));
  return { useSettings: Object.assign(jest.fn(), { getState }) };
});

function completeOnboardingMock() {
  return (useSettings as unknown as { getState: () => { completeOnboarding: jest.Mock } })
    .getState().completeOnboarding;
}

describe("useOnboardingFlow", () => {
  beforeEach(() => {
    useOnboardingFlow.setState({
      activeIndex: 0,
      completion: "idle",
      reminderChoice: null,
    });
    completeOnboardingMock().mockClear();
    completeOnboardingMock().mockResolvedValue(undefined);
  });

  it("starts idle at index 0 with no reminder choice", () => {
    const s = useOnboardingFlow.getState();
    expect(s.activeIndex).toBe(0);
    expect(s.completion).toBe("idle");
    expect(s.reminderChoice).toBeNull();
  });

  it("setActiveIndex updates the active index", () => {
    useOnboardingFlow.getState().setActiveIndex(2);
    expect(useOnboardingFlow.getState().activeIndex).toBe(2);
  });

  it("setReminderChoice records the choice", () => {
    useOnboardingFlow.getState().setReminderChoice("enabled");
    expect(useOnboardingFlow.getState().reminderChoice).toBe("enabled");
  });

  it("finish() goes saving -> idle and calls useSettings.completeOnboarding once", async () => {
    const promise = useOnboardingFlow.getState().finish();
    expect(useOnboardingFlow.getState().completion).toBe("saving");
    await promise;
    expect(useOnboardingFlow.getState().completion).toBe("idle");
    expect(completeOnboardingMock()).toHaveBeenCalledTimes(1);
  });

  it("finish() surfaces a failure shape when completeOnboarding rejects, without a second writer", async () => {
    completeOnboardingMock().mockRejectedValueOnce(new Error("disk full"));
    await useOnboardingFlow.getState().finish();
    expect(useOnboardingFlow.getState().completion).toEqual({
      status: "failure",
      error: "disk full",
    });
  });
});
