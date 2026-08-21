// src/features/onboarding/onboarding-page.tsx
import React, { ReactNode } from 'react';
import { Image, ScrollView } from 'react-native';
import { Typography } from 'heroui-native';
import { Section } from '@/components';
import type { TranslateFn } from '@/i18n/use-i18n';
import type { OnboardingStep } from './onboarding-content';

type OnboardingPageProps = {
  readonly step: OnboardingStep;
  readonly variation?: ReactNode;
  readonly translate?: TranslateFn;
};

export function OnboardingPage({ step, variation, translate }: OnboardingPageProps) {
  const copy = (key: OnboardingStep['titleKey']) => translate?.(key) ?? key;

  return (
      <ScrollView
          className="flex-1"
          contentContainerClassName="grow justify-center px-4 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
      >
        <Section className="w-full max-w-md self-center items-center gap-4">
          {step.illustration && (
              <Image
                  source={step.illustration}
                  resizeMode="contain"
                  accessibilityRole="image"
                  className="h-44 w-44"
              />
          )}
          <Typography type="h1" accessibilityRole="header" className="text-center font-bold">
            {copy(step.titleKey)}
          </Typography>
          {step.bodyKey && (
              <Typography type="body" className="text-center text-default-500 leading-relaxed">
                {copy(step.bodyKey)}
              </Typography>
          )}
          {variation}
        </Section>
      </ScrollView>
  );
}