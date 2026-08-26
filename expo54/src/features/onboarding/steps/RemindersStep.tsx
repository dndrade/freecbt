import { View } from "react-native";
import { Button } from "heroui-native";
import * as ImagePath from "@/src/assets/image-path";
import { useI18n } from "@/i18n/use-i18n";
import { useReminders } from "@/features/reminders/use-reminders";
import { OnboardingStepFrameLegacy } from "./RemindersStepFrame";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function RemindersStep() {
  const i18n = useI18n();
  const reminders = useReminders();
  const next = useOnboardingFlow((s) => s.next);

  return (
    <OnboardingStepFrameLegacy
      titleKey="onboarding_screen.reminders.header"
      illustration={ImagePath.notifications}
      translate={i18n.t.bind(i18n)}
      variation={
        <View className="w-full max-w-xs gap-3">
          <Button
            onPress={async () => {
              await reminders.enableReminders(undefined, i18n.t.bind(i18n));
              next();
            }}
          >
            {i18n.t("onboarding_screen.reminders.button.yes")}
          </Button>
          <Button
            variant="secondary"
            onPress={async () => {
              await reminders.disableReminders();
              next();
            }}
          >
            {i18n.t("onboarding_screen.reminders.button.no")}
          </Button>
        </View>
      }
    />
  );
}
