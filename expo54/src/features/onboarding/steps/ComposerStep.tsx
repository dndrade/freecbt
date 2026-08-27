import React from "react";
import { Typography } from "heroui-native";
import { Section, TextInput } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";
import { ContinueButton } from "../components/ContinueButton";

export function ComposerStep() {
  const i18n = useI18n();
  const thought = useOnboardingFlow((s) => s.composerThought);
  const setComposerThought = useOnboardingFlow((s) => s.setComposerThought);
  const finishOnboarding = useOnboardingFlow((s) => s.finishOnboarding);
  const ready = thought.trim().length > 0;

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-accent">
        {i18n.t("onboarding_screen.composer.eyebrow")}
      </Typography>
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.composer.title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.composer.body")}
      </Typography>
      <TextInput
        value={thought}
        onChangeText={setComposerThought}
        placeholder={i18n.t("onboarding_screen.composer.placeholder")}
        multiline
        numberOfLines={5}
        description={i18n.t(
          ready
            ? "onboarding_screen.composer.hint_ready"
            : "onboarding_screen.composer.hint_default",
        )}
      />
      <ContinueButton
        title={i18n.t("onboarding_screen.composer.cta")}
        onPress={() => void finishOnboarding()}
        disabled={!ready}
      />
    </Section>
  );
}
