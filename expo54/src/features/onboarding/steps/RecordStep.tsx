import { Link } from "expo-router";
import { Button } from "heroui-native";
import * as ImagePath from "@/src/assets/image-path";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";
import type { OnboardingStepProps } from "./index";

export function RecordStep({ translate }: OnboardingStepProps) {
  return (
    <OnboardingStepFrame
      titleKey="onboarding_screen.readme"
      illustration={ImagePath.looker}
      translate={translate}
      variation={
        <Link
          asChild
          href="https://freecbt.erosson.org/explanation/?ref=quirk"
          accessibilityLabel={translate("onboarding_screen.header")}
        >
          <Button variant="secondary">{translate("onboarding_screen.header")}</Button>
        </Link>
      }
    />
  );
}
