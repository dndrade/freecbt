import React from "react";
import Animated, { FadeInUp, ReduceMotion } from "react-native-reanimated";
import { Typography } from "heroui-native";
import { Button, Section, StandardScreen } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { JournalEntryCard } from "../components/JournalEntryCard";

export interface HomeHandoffScreenProps {
  finalThought?: string;
}

export function HomeHandoffScreen({ finalThought }: HomeHandoffScreenProps) {
  const i18n = useI18n();
  const hasThought = Boolean(finalThought?.trim());

  return (
    <StandardScreen scrollable={false} contentClassName="flex-1">
      <Section className="flex-1 justify-center gap-4 px-6">
        <Animated.View
          entering={FadeInUp.duration(200).reduceMotion(ReduceMotion.System)}
        >
          <Typography
            type="body-xs"
            className="uppercase font-bold text-secondary"
          >
            {i18n.t("onboarding_screen.home_handoff.eyebrow")}
          </Typography>
          <Typography
            type="h2"
            accessibilityRole="header"
            className="font-bold"
          >
            {hasThought
              ? i18n.t("onboarding_screen.home_handoff.title_with_thought")
              : i18n.t("onboarding_screen.home_handoff.title_empty")}
          </Typography>
          <Typography type="body" className="text-default-500">
            {hasThought
              ? i18n.t("onboarding_screen.home_handoff.body_with_thought")
              : i18n.t("onboarding_screen.home_handoff.body_empty")}
          </Typography>
        </Animated.View>
        <Animated.View
          entering={FadeInUp.duration(240)
            .delay(60)
            .reduceMotion(ReduceMotion.System)}
        >
          <JournalEntryCard thought={finalThought} />
        </Animated.View>
        <Button
          title={
            (hasThought
              ? i18n.t("onboarding_screen.home_handoff.cta_with_thought")
              : i18n.t("onboarding_screen.home_handoff.cta_empty")) ?? ""
          }
          onPress={() => {}}
        />
      </Section>
    </StandardScreen>
  );
}
