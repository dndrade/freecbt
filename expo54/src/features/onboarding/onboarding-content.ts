import * as ImagePath from "@/src/assets/image-path";
import type { TranslateKey } from "@/src/i18n/use-i18n";
import type { ImageSourcePropType } from "react-native";

export type OnboardingPresentation = "guide" | "informational" | "reminders";

export type OnboardingStep = {
  readonly id: "record" | "challenge" | "change" | "reminders";
  readonly illustration: ImageSourcePropType;
  readonly titleKey: TranslateKey;
  readonly bodyKey?: TranslateKey;
  readonly presentation: OnboardingPresentation;
};

export const onboardingSteps = [
  {
    id: "record",
    illustration: ImagePath.looker,
    titleKey: "onboarding_screen.readme",
    presentation: "guide",
  },
  {
    id: "challenge",
    illustration: ImagePath.eater,
    titleKey: "onboarding_screen.block1.header",
    bodyKey: "onboarding_screen.block1.body",
    presentation: "informational",
  },
  {
    id: "change",
    illustration: ImagePath.logo,
    titleKey: "onboarding_screen.block2.header",
    bodyKey: "onboarding_screen.block2.body",
    presentation: "informational",
  },
  {
    id: "reminders",
    illustration: ImagePath.notifications,
    titleKey: "onboarding_screen.reminders.header",
    presentation: "reminders",
  },
] as const satisfies readonly OnboardingStep[];
