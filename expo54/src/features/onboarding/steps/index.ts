import type { ComponentType } from "react";
import type { Reminders } from "@/src/features/reminders/use-reminders";
import type { TranslateFn } from "@/src/i18n/use-i18n";
import { getFeatureFlag } from "@/services";
import { ComposerStep } from "./ComposerStep";
import { GuidedAlternativeStep } from "./GuidedAlternativeStep";
import { GuidedCompleteStep } from "./GuidedCompleteStep";
import { GuidedEvidenceStep } from "./GuidedEvidenceStep";
import { GuidedPatternStep } from "./GuidedPatternStep";
import { GuidedSituationStep } from "./GuidedSituationStep";
import { GuidedThoughtStep } from "./GuidedThoughtStep";
import { GuidedYourTurnStep } from "./GuidedYourTurnStep";
import { InvitationStep } from "./InvitationStep";
import { PathStep } from "./PathStep";
import { PrivacyStep } from "./PrivacyStep";
import { RemindersStep } from "./RemindersStep";
import { WelcomeStep } from "./WelcomeStep";

export type OnboardingStepId =
  | "welcome"
  | "privacy"
  | "path"
  | "reminders"
  | "invitation"
  | "composer"
  | "g-situation"
  | "g-thought"
  | "g-pattern"
  | "g-evidence"
  | "g-alternative"
  | "g-complete"
  | "g-your-turn";

export const stepRegistry: Record<OnboardingStepId, ComponentType> = {
  welcome: WelcomeStep,
  privacy: PrivacyStep,
  path: PathStep,
  reminders: RemindersStep,
  invitation: InvitationStep,
  composer: ComposerStep,
  "g-situation": GuidedSituationStep,
  "g-thought": GuidedThoughtStep,
  "g-pattern": GuidedPatternStep,
  "g-evidence": GuidedEvidenceStep,
  "g-alternative": GuidedAlternativeStep,
  "g-complete": GuidedCompleteStep,
  "g-your-turn": GuidedYourTurnStep,
};

export const NO_SWIPE_STEP_IDS: ReadonlySet<OnboardingStepId> = new Set([
  "invitation",
]);

export function buildStepIds(options: {
  includeReminders: boolean;
}): OnboardingStepId[] {
  const base: OnboardingStepId[] = ["welcome", "privacy", "path"];
  if (options.includeReminders) base.push("reminders");
  base.push("invitation");
  return base;
}

export function isKnownStepId(id: string): id is OnboardingStepId {
  return Object.prototype.hasOwnProperty.call(stepRegistry, id);
}

export function remindersEnabled(): boolean {
  return getFeatureFlag("enable_onboarding_reminders_step");
}

export type OnboardingStepProps = {
  translate: TranslateFn;
  reminders: Reminders;
};
