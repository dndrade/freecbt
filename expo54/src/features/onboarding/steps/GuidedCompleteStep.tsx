import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { Button, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedCompleteStep() {
  const i18n = useI18n();
  const alternative = useOnboardingFlow((s) => s.guidedAlternative);
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 items-center justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-success">
        {i18n.t("onboarding_screen.guided.complete_eyebrow")}
      </Typography>
      <Typography
        type="h1"
        accessibilityRole="header"
        className="text-center font-bold"
      >
        {i18n.t("onboarding_screen.guided.complete_title")}
      </Typography>
      <Typography type="body" className="text-center text-default-500">
        {i18n.t("onboarding_screen.guided.complete_body")}
      </Typography>
      <View className="w-full gap-2 rounded-2xl border border-default-soft bg-accent/10 p-5">
        <Typography
          type="body-xs"
          className="uppercase font-bold text-default-500"
        >
          {i18n.t("onboarding_screen.guided.complete_thought_label")}
        </Typography>
        <Typography type="h4" className="font-bold">
          {alternative}
        </Typography>
      </View>
      <Button
        title={i18n.t("onboarding_screen.guided.complete_cta") ?? ""}
        onPress={next}
      />
    </Section>
  );
}
