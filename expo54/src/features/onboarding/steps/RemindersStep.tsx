import { View } from "react-native";
import { Button } from "heroui-native";
import * as ImagePath from "@/src/assets/image-path";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";
import type { OnboardingStepProps } from "./index";

export function RemindersStep({ translate, reminders }: OnboardingStepProps) {
  return (
    <OnboardingStepFrame
      titleKey="onboarding_screen.reminders.header"
      illustration={ImagePath.notifications}
      translate={translate}
      variation={
        <View className="w-full max-w-xs gap-3">
          <Button
            onPress={() => {
              void reminders.enableReminders(undefined, translate);
            }}
          >
            {translate("onboarding_screen.reminders.button.yes")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              void reminders.disableReminders();
            }}
          >
            {translate("onboarding_screen.reminders.button.no")}
          </Button>
        </View>
      }
    />
  );
}
