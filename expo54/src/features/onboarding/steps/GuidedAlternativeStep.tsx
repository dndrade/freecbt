import React from "react";
import { Typography } from "heroui-native";
import { ChipRow, Section, TextInput } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { ContinueButton } from "../components/ContinueButton";
import { StepChipRow } from "../components/StepChipRow";
import { situations } from "../content/situations";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedAlternativeStep() {
  const i18n = useI18n();
  const situation = useOnboardingFlow((s) => s.situation);
  const alternative = useOnboardingFlow((s) => s.guidedAlternative);
  const setGuidedAlternative = useOnboardingFlow((s) => s.setGuidedAlternative);
  const appendAlternativePhrase = useOnboardingFlow(
    (s) => s.appendAlternativePhrase,
  );
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <StepChipRow current="change" />
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.alternative_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.alternative_body")}
      </Typography>
      <ChipRow
        items={situations[situation].phrases}
        onPress={appendAlternativePhrase}
      />
      <TextInput
        value={alternative}
        onChangeText={setGuidedAlternative}
        placeholder={i18n.t("onboarding_screen.guided.alternative_placeholder")}
        multiline
        numberOfLines={4}
      />
      <ContinueButton
        title={i18n.t("onboarding_screen.guided.alternative_cta")}
        onPress={next}
        disabled={!alternative.trim()}
      />
    </Section>
  );
}
