import React from "react";
import { Typography } from "heroui-native";
import { Section, TextInput } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { ContinueButton } from "../components/ContinueButton";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedYourTurnStep() {
  const i18n = useI18n();
  const thought = useOnboardingFlow((s) => s.guidedPersonalThought);
  const setGuidedPersonalThought = useOnboardingFlow(
    (s) => s.setGuidedPersonalThought,
  );
  const finishOnboarding = useOnboardingFlow((s) => s.finishOnboarding);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-secondary">
        {i18n.t("onboarding_screen.guided.your_turn_eyebrow")}
      </Typography>
      <Typography type="h1" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.your_turn_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.your_turn_body")}
      </Typography>
      <TextInput
        value={thought}
        onChangeText={setGuidedPersonalThought}
        placeholder={i18n.t("onboarding_screen.guided.your_turn_placeholder")}
        description={i18n.t("onboarding_screen.guided.your_turn_hint")}
        multiline
        numberOfLines={5}
      />
      <ContinueButton
        title={i18n.t("onboarding_screen.guided.your_turn_cta")}
        onPress={() => void finishOnboarding()}
        disabled={!thought.trim()}
      />
    </Section>
  );
}
