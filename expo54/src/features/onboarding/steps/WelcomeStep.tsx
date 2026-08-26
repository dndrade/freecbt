import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { Button, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";
import { OnboardingMascot } from "../components/OnboardingMascot";

export function WelcomeStep() {
  const i18n = useI18n();
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 items-center justify-center gap-5 px-6">
      <OnboardingMascot color="yellow" size={132} />
      <View className="gap-3 items-center">
        <Typography type="body-xs" className="uppercase font-bold text-accent">
          {i18n.t("onboarding_screen.welcome.eyebrow")}
        </Typography>
        <Typography
          type="h1"
          accessibilityRole="header"
          className="text-center font-bold"
        >
          {i18n.t("onboarding_screen.welcome.title")}
        </Typography>
        <Typography type="body" className="text-center text-default-500">
          {i18n.t("onboarding_screen.welcome.body")}
        </Typography>
      </View>
      <Button
        title={i18n.t("onboarding_screen.welcome.cta") ?? ""}
        onPress={next}
      />
    </Section>
  );
}
