import React, { ReactNode } from 'react';
import { Image, ImageSourcePropType, ScrollView } from 'react-native';
import { Typography } from 'heroui-native';
import { Section } from '@/components';
import type { TranslateFn } from '@/i18n/use-i18n';

export type OnboardingStepFrameProps = {
  readonly titleKey: string;
  readonly bodyKey?: string;
  readonly illustration?: ImageSourcePropType;
  readonly variation?: ReactNode;
  readonly translate?: TranslateFn;
};

export function OnboardingStepFrame({
  titleKey,
  bodyKey,
  illustration,
  variation,
  translate,
}: OnboardingStepFrameProps) {
  const copy = (key: string) => translate?.(key as Parameters<TranslateFn>[0]) ?? key;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="grow justify-center px-4 pb-6"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Section className="w-full max-w-md self-center items-center gap-4">
        {illustration && (
          <Image
            source={illustration}
            resizeMode="contain"
            accessibilityRole="image"
            className="h-44 w-44"
          />
        )}
        <Typography type="h1" accessibilityRole="header" className="text-center font-bold">
          {copy(titleKey)}
        </Typography>
        {bodyKey && (
          <Typography type="body" className="text-center text-default-500 leading-relaxed">
            {copy(bodyKey)}
          </Typography>
        )}
        {variation}
      </Section>
    </ScrollView>
  );
}
