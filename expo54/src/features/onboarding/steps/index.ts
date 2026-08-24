import type { ReactNode } from "react";
import type { Reminders } from "@/src/features/reminders/use-reminders";
import type { TranslateFn } from "@/src/i18n/use-i18n";
import { ChallengeStep } from "./ChallengeStep";
import { ChangeStep } from "./ChangeStep";
import { RecordStep } from "./RecordStep";
import { RemindersStep } from "./RemindersStep";

export type OnboardingStepId = "record" | "challenge" | "change" | "reminders";

export type OnboardingStepProps = {
  translate: TranslateFn;
  reminders: Reminders;
};

export type OnboardingStepDefinition = {
  id: OnboardingStepId;
  Component: (props: OnboardingStepProps) => ReactNode;
};

const registry: Record<OnboardingStepId, OnboardingStepDefinition> = {
  record: { id: "record", Component: RecordStep },
  challenge: { id: "challenge", Component: ChallengeStep },
  change: { id: "change", Component: ChangeStep },
  reminders: { id: "reminders", Component: RemindersStep },
};

const defaultOrder: readonly OnboardingStepId[] = ["record", "challenge", "change", "reminders"];

function isKnownStepId(id: string): id is OnboardingStepId {
  return Object.prototype.hasOwnProperty.call(registry, id);
}

export function buildOnboardingSteps(options: {
  includeReminders: boolean;
  candidateIds?: readonly string[];
}): OnboardingStepDefinition[] {
  const candidates = options.candidateIds ?? defaultOrder;
  return candidates
    .filter(isKnownStepId)
    .filter((id) => options.includeReminders || id !== "reminders")
    .map((id) => registry[id]);
}
