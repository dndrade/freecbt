import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { SelectableCard, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { DistortionData } from "@/model";
import { ContinueButton } from "../components/ContinueButton";
import { StepChipRow } from "../components/StepChipRow";
import { situations } from "../content/situations";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedPatternStep() {
  const i18n = useI18n();
  const situation = useOnboardingFlow((s) => s.situation);
  const selected = useOnboardingFlow((s) => s.selectedDistortionSlugs);
  const toggleDistortion = useOnboardingFlow((s) => s.toggleDistortion);
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <StepChipRow current="check" />
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.pattern_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.pattern_body")}
      </Typography>
      <View className="gap-3">
        {situations[situation].distortionSlugs.map((slug) => {
          const distortion = DistortionData.bySlug.get(slug);
          if (!distortion) return null;

          return (
            <SelectableCard
              key={slug}
              title={i18n.t(distortion.labelKey)}
              detail={i18n.t(distortion.descriptionKey)}
              selected={selected.includes(slug)}
              onPress={() => toggleDistortion(slug)}
            />
          );
        })}
      </View>
      <ContinueButton
        title={i18n.t("onboarding_screen.guided.pattern_cta")}
        onPress={next}
        disabled={selected.length === 0}
      />
    </Section>
  );
}
