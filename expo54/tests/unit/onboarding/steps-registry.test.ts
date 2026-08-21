jest.mock("@/src/features/onboarding/components/OnboardingStepFrame", () => ({
  OnboardingStepFrame: () => null,
}));

import { buildOnboardingSteps } from "@/src/features/onboarding/steps";

describe("buildOnboardingSteps", () => {
  it("includes all four steps in order when reminders are supported", () => {
    const steps = buildOnboardingSteps({ includeReminders: true });
    expect(steps.map((s) => s.id)).toEqual(["record", "challenge", "change", "reminders"]);
  });

  it("drops the reminders step when reminders are unsupported", () => {
    const steps = buildOnboardingSteps({ includeReminders: false });
    expect(steps.map((s) => s.id)).toEqual(["record", "challenge", "change"]);
  });

  it("filters out an unrecognized candidate id instead of throwing", () => {
    const steps = buildOnboardingSteps({
      includeReminders: true,
      candidateIds: ["record", "not-a-real-step", "change"],
    });
    expect(steps.map((s) => s.id)).toEqual(["record", "change"]);
  });

  it("every produced step has a component", () => {
    const steps = buildOnboardingSteps({ includeReminders: true });
    for (const step of steps) {
      expect(typeof step.Component).toBe("function");
    }
  });
});
