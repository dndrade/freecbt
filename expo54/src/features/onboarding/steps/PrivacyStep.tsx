import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { Button, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function PrivacyStep() {
  const i18n = useI18n();
  const next = useOnboardingFlow((s) => s.next);
  const chips = [
    i18n.t("onboarding_screen.privacy.chip_local_first"),
    i18n.t("onboarding_screen.privacy.chip_no_sign_in"),
    i18n.t("onboarding_screen.privacy.chip_your_choice"),
  ];

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-accent">
        {i18n.t("onboarding_screen.privacy.eyebrow")}
      </Typography>
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.privacy.title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.privacy.body")}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((chip) => (
          <View
            key={chip}
            className="rounded-full border border-separator px-3 py-2"
          >
            <Typography type="body-xs">{chip}</Typography>
          </View>
        ))}
      </View>
      <Button
        title={i18n.t("onboarding_screen.privacy.cta") ?? ""}
        onPress={next}
      />
    </Section>
  );
}
