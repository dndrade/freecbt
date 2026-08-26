import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { Button, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { OnboardingMascot } from "../components/OnboardingMascot";
import { StepChipRow } from "../components/StepChipRow";
import { situations } from "../content/situations";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

export function GuidedThoughtStep() {
  const i18n = useI18n();
  const situation = useOnboardingFlow((s) => s.situation);
  const revealed = useOnboardingFlow((s) => s.revealed);
  const reveal = useOnboardingFlow((s) => s.reveal);
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <StepChipRow current="catch" />
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.guided.thought_title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.guided.thought_body")}
      </Typography>
      {revealed ? (
        <Animated.View
          entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
          className="gap-2 rounded-2xl border border-accent/50 bg-accent/10 p-5"
        >
          <Typography
            type="body-xs"
            className="uppercase font-bold text-default-500"
          >
            {i18n.t("auto_thought")}
          </Typography>
          <Typography type="h4" className="font-bold">
            “{situations[situation].autoThought}”
          </Typography>
          <Typography type="body-sm" className="text-default-500">
            {i18n.t("onboarding_screen.guided.thought_revealed_hint")}
          </Typography>
        </Animated.View>
      ) : (
        <View className="items-center py-6">
          <OnboardingMascot color="purple" size={112} />
        </View>
      )}
      <Button
        title={
          (revealed
            ? i18n.t("onboarding_screen.guided.thought_continue_cta")
            : i18n.t("onboarding_screen.guided.thought_reveal_cta")) ?? ""
        }
        onPress={revealed ? next : reveal}
      />
    </Section>
  );
}
