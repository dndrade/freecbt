import * as ImagePath from "@/src/assets/image-path";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";
import type { OnboardingStepProps } from "./index";

export function ChallengeStep({ translate }: OnboardingStepProps) {
  return (
    <OnboardingStepFrame
      titleKey="onboarding_screen.block1.header"
      bodyKey="onboarding_screen.block1.body"
      illustration={ImagePath.eater}
      translate={translate}
    />
  );
}
