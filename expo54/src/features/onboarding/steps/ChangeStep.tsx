import * as ImagePath from "@/src/assets/image-path";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";
import type { OnboardingStepProps } from "./index";

export function ChangeStep({ translate }: OnboardingStepProps) {
  return (
    <OnboardingStepFrame
      titleKey="onboarding_screen.block2.header"
      bodyKey="onboarding_screen.block2.body"
      illustration={ImagePath.logo}
      translate={translate}
    />
  );
}
