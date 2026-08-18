import { Section } from "@/src/components";
import type { TranslateFn } from "@/src/i18n/use-i18n";
import { Typography } from "heroui-native";
import type { ReactNode } from "react";
import { Image, ScrollView } from "react-native";
import type { OnboardingStep } from "./onboarding-content";

type OnboardingPageProps = {
  readonly step: OnboardingStep;
  readonly variation: ReactNode;
  readonly translate?: TranslateFn;
};

export function OnboardingPage({ step, variation, translate }: OnboardingPageProps) {
  const copy = (key: OnboardingStep["titleKey"]) => translate?.(key) ?? key;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="grow justify-center px-2 pb-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
    >
      <Section className="w-full max-w-xl self-center items-center gap-4">
        <Image
          source={step.illustration}
          resizeMode="contain"
          accessibilityRole="image"
          className="h-40 w-40"
        />
        <Typography type="h1" accessibilityRole="header" className="text-center">
          {copy(step.titleKey)}
        </Typography>
        {step.bodyKey ? (
          <Typography type="body" color="muted" className="text-center">
            {copy(step.bodyKey)}
          </Typography>
        ) : null}
        {variation}
      </Section>
    </ScrollView>
  );
}
