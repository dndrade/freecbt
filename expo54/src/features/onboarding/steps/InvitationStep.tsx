import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { SelectableCard, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function InvitationStep() {
  const i18n = useI18n();
  const goTo = useOnboardingFlow((s) => s.goTo);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-accent">
        {i18n.t("onboarding_screen.invitation.eyebrow")}
      </Typography>
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.invitation.title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.invitation.body")}
      </Typography>
      <View className="gap-3">
        <SelectableCard
          title={i18n.t("onboarding_screen.invitation.guided_title")}
          detail={i18n.t("onboarding_screen.invitation.guided_body")}
          tag={i18n.t("onboarding_screen.invitation.guided_tag")}
          selected={false}
          onPress={() => goTo("g-situation")}
        />
        <SelectableCard
          title={i18n.t("onboarding_screen.invitation.quick_title")}
          detail={i18n.t("onboarding_screen.invitation.quick_body")}
          selected={false}
          onPress={() => goTo("composer")}
        />
      </View>
    </Section>
  );
}
