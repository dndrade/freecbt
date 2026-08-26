import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { Button, Section } from "@/shared/components";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";

const NODES = ["thought", "pattern", "challenge", "alternative"] as const;

export function PathStep() {
  const i18n = useI18n();
  const next = useOnboardingFlow((s) => s.next);

  return (
    <Section className="flex-1 justify-center gap-4 px-6">
      <Typography type="body-xs" className="uppercase font-bold text-accent">
        {i18n.t("onboarding_screen.path.eyebrow")}
      </Typography>
      <Typography type="h2" accessibilityRole="header" className="font-bold">
        {i18n.t("onboarding_screen.path.title")}
      </Typography>
      <Typography type="body" className="text-default-500">
        {i18n.t("onboarding_screen.path.body")}
      </Typography>
      <View className="gap-3">
        {NODES.map((node, index) => (
          <View key={node} className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full border border-separator">
              <Typography type="body-sm" className="font-bold">
                {String(index + 1).padStart(2, "0")}
              </Typography>
            </View>
            <View className="flex-1">
              <Typography type="body" className="font-bold">
                {i18n.t(`onboarding_screen.path.node_${node}_title` as never)}
              </Typography>
              <Typography type="body-sm" className="text-default-500">
                {i18n.t(`onboarding_screen.path.node_${node}_body` as never)}
              </Typography>
            </View>
          </View>
        ))}
      </View>
      <Button
        title={i18n.t("onboarding_screen.path.cta") ?? ""}
        onPress={next}
      />
    </Section>
  );
}
