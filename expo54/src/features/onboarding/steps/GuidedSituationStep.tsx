import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { SelectableCard, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { ContinueButton } from "../components/ContinueButton";
import { StepChipRow } from "../components/StepChipRow";
import { situationIds, situations } from "../content/situations";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedSituationStep() {
  const i18n = useI18n();
  const situation = useOnboardingFlow((s) => s.situation);
  const chooseSituation = useOnboardingFlow((s) => s.chooseSituation);
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <StepChipRow current="catch" />
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.situation_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.situation_body")}
      </Typography>
      <View className="gap-3">
        {situationIds.map((id) => (
          <SelectableCard
            key={id}
            title={situations[id].title}
            detail={situations[id].detail}
            selected={situation === id}
            onPress={() => chooseSituation(id)}
          />
        ))}
      </View>
      <ContinueButton
        title={i18n.t("onboarding_screen.guided.situation_cta")}
        onPress={next}
      />
    </Section>
  );
}
