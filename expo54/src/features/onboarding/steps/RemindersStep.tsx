import { View } from "react-native";
import { Button } from "heroui-native";
import * as ImagePath from "@/src/assets/image-path";
import { useSettings } from "@/src/features/settings/hooks/useSettings";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";
import type { OnboardingStepProps } from "./index";

export function RemindersStep({ translate, reminders }: OnboardingStepProps) {
  const setReminders = useSettings((s) => s.setReminders);

  return (
    <OnboardingStepFrame
      titleKey="onboarding_screen.reminders.header"
      illustration={ImagePath.notifications}
      translate={translate}
      variation={
        <View className="w-full max-w-xs gap-3">
          <Button
            onPress={() => {
              void reminders.enable(() => {}, translate);
              void setReminders(true);
            }}
          >
            {translate("onboarding_screen.reminders.button.yes")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              void reminders.disable(() => {});
              void setReminders(false);
            }}
          >
            {translate("onboarding_screen.reminders.button.no")}
          </Button>
        </View>
      }
    />
  );
}
