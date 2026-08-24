import { Routes } from "@/src";
import { Distortion, Thought } from "@/src/model";
import * as ImagePath from "@/src/assets/image-path";
import { TranslateFn } from "@/src/i18n/use-i18n";
import { Link } from "expo-router";
import { Typography } from "heroui-native";
import React from "react";
import { Image, Pressable, View } from "react-native";

export const SHRUG_EMOJI = "🤷‍";

export function ThoughtFieldCards({
  thought,
  distortions: availableDistortions,
  translate: t,
}: {
  thought: Thought.Thought;
  distortions: readonly Distortion.Distortion[];
  translate: TranslateFn;
}) {
  const slugs = new Set(
    Array.from(thought.cognitiveDistortions).map((d) => d.slug),
  );
  const distortions = availableDistortions.filter((d) => slugs.has(d.slug));
  const notSet = t("accessibility.thought_field_not_set");
  const distortionsSummary = distortions.length
    ? distortions.map((d) => t(d.labelKey)).join(", ")
    : notSet;

  return (
    <>
      <View testID="view-thought-screen" className="gap-1">
        <Typography type="h4">{t("auto_thought")}</Typography>
        <Link
          href={Routes.thoughtEditV2(thought.uuid, "automatic-thought")}
          accessibilityRole="link"
          accessibilityLabel={`${t("auto_thought")}: ${thought.automaticThought || notSet}`}
          asChild
        >
          <Pressable className="flex-row items-center rounded-lg border border-border bg-surface-secondary p-2">
            {thought.automaticThought ? (
              <>
                <Image
                  source={ImagePath.yellowBubble}
                  className="h-6 w-6 self-center mr-2"
                />
                <Typography type="body" selectable className="flex-1">
                  {thought.automaticThought}
                </Typography>
              </>
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </Pressable>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("cog_distortion")}</Typography>
        <Link
          href={Routes.thoughtEditV2(thought.uuid, "distortions")}
          accessibilityRole="link"
          accessibilityLabel={`${t("cog_distortion")}: ${distortionsSummary}`}
          asChild
        >
          <Pressable className="gap-1 rounded-lg border border-border bg-surface-secondary p-2">
            {distortions.length ? (
              distortions.map((d) => (
                <Typography key={d.slug} type="body">
                  {Distortion.emoji(d)} {t(d.labelKey)}
                </Typography>
              ))
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </Pressable>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("challenge")}</Typography>
        <Link
          href={Routes.thoughtEditV2(thought.uuid, "challenge")}
          accessibilityRole="link"
          accessibilityLabel={`${t("challenge")}: ${thought.challenge || notSet}`}
          asChild
        >
          <Pressable className="rounded-lg border border-border bg-surface-secondary p-2">
            <Typography type="body" selectable>
              {thought.challenge || SHRUG_EMOJI}
            </Typography>
          </Pressable>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("alt_thought")}</Typography>
        <Link
          href={Routes.thoughtEditV2(thought.uuid, "alternative-thought")}
          accessibilityRole="link"
          accessibilityLabel={`${t("alt_thought")}: ${thought.alternativeThought || notSet}`}
          asChild
        >
          <Pressable className="flex-row items-center rounded-lg border border-border bg-surface-secondary p-2">
            {thought.alternativeThought ? (
              <>
                <Image
                  source={ImagePath.pinkBubble}
                  className="h-6 w-6 self-center mr-2"
                />
                <Typography type="body" selectable className="flex-1">
                  {thought.alternativeThought}
                </Typography>
              </>
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </Pressable>
        </Link>
      </View>
    </>
  );
}
