import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { SelectableCard, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { ContinueButton } from "../components/ContinueButton";
import { StepChipRow } from "../components/StepChipRow";
import { situations } from "../content/situations";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedEvidenceStep() {
  const i18n = useI18n();
  const situation = useOnboardingFlow((s) => s.situation);
  const selected = useOnboardingFlow((s) => s.selectedEvidenceIds);
  const toggleEvidence = useOnboardingFlow((s) => s.toggleEvidence);
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <StepChipRow current="challenge" />
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.evidence_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.evidence_body")}
      </Typography>
      <View className="gap-3">
        {situations[situation].evidence.map((text) => (
          <SelectableCard
            key={text}
            title={text}
            selected={selected.includes(text)}
            onPress={() => toggleEvidence(text)}
            variant="check"
          />
        ))}
      </View>
      <ContinueButton
        title={i18n.t("onboarding_screen.guided.evidence_cta")}
        onPress={next}
        disabled={selected.length === 0}
      />
    </Section>
  );
}
