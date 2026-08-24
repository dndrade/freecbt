type OnboardingCompletion =
  "idle" | "saving" | { status: "failure"; error: unknown };

export type SlideName = "record" | "challenge" | "change" | "reminders";

export const slidesWithReminders = [
  "record",
  "challenge",
  "change",
  "reminders",
] as const satisfies readonly SlideName[];

export const slidesWithoutReminders = [
  "record",
  "challenge",
  "change",
] as const satisfies readonly SlideName[];

export const completionIdle = "idle" as const satisfies OnboardingCompletion;
export const completionSaving =
  "saving" as const satisfies OnboardingCompletion;
export const completionFailure = {
  status: "failure",
  error: "simulated onboarding save failure",
} as const satisfies Extract<OnboardingCompletion, { status: "failure" }>;

export const reminderOutcomes = {
  enabled: true,
  disabled: false,
} as const;
