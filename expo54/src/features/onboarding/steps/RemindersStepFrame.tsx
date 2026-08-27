import React, { type ReactNode } from "react";
import { Image, type ImageSourcePropType, ScrollView } from "react-native";
import { Typography } from "heroui-native";
import { Section } from "@/shared/components";
import type { TranslateFn } from "@/i18n/use-i18n";

export function OnboardingStepFrameLegacy(props: {
  titleKey: string;
  illustration?: ImageSourcePropType;
  variation?: ReactNode;
  translate: TranslateFn;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="grow justify-center px-4 pb-6"
    >
      <Section className="w-full max-w-md self-center items-center gap-4">
        {props.illustration && (
          <Image
            source={props.illustration}
            resizeMode="contain"
            accessibilityRole="image"
            className="h-44 w-44"
          />
        )}
        <Typography
          type="h1"
          accessibilityRole="header"
          className="text-center font-bold"
        >
          {props.translate(props.titleKey as never)}
        </Typography>
        {props.variation}
      </Section>
    </ScrollView>
  );
}
