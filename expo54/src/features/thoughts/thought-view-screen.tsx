import { Routes } from "@/src";
import { Screen } from "@/src/components";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Distortion } from "@/src/model";
import * as ImagePath from "@/src/assets/image-path";
import { Link } from "expo-router";
import { Typography } from "heroui-native";
import React from "react";
import { Image, View } from "react-native";
import { useThoughtFromParams } from "./use-thought-from-route";

export const SHRUG_EMOJI = "🤷‍";

export function ThoughtViewScreen({ model, translate: t }: ModelLoadedProps) {
  const res = useThoughtFromParams(model);
  if (res.status === "error") return res.error;
  const thought = res.value;
  // filter model.distortionData.list below, instead of iterating
  // thought.cognitiveDistortions directly, because it guarantees a
  // consistent order.
  const slugs = new Set(
    Array.from(thought.cognitiveDistortions).map((d) => d.slug)
  );
  const distortions = model.distortionData.list.filter((d) =>
    slugs.has(d.slug)
  );
  return (
    <Screen scroll contentClassName="flex-1 gap-4">
      <View testID="view-thought-screen" className="gap-1">
        <Typography type="h4">{t("auto_thought")}</Typography>
        <Link href={Routes.thoughtEditV2(thought.uuid, "automatic-thought")} asChild>
          <View className="flex-row items-center rounded-lg border border-border bg-surface-secondary p-2">
            {thought.automaticThought ? (
              <>
                <Image source={ImagePath.yellowBubble} className="h-6 w-6 self-center mr-2" />
                <Typography type="body" selectable className="flex-1">
                  {thought.automaticThought}
                </Typography>
              </>
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </View>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("cog_distortion")}</Typography>
        <Link href={Routes.thoughtEditV2(thought.uuid, "distortions")} asChild>
          <View className="gap-1 rounded-lg border border-border bg-surface-secondary p-2">
            {distortions.length ? (
              distortions.map((d) => (
                <Typography key={d.slug} type="body">
                  {Distortion.emoji(d)} {t(d.labelKey)}
                </Typography>
              ))
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </View>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("challenge")}</Typography>
        <Link href={Routes.thoughtEditV2(thought.uuid, "challenge")} asChild>
          <View className="rounded-lg border border-border bg-surface-secondary p-2">
            <Typography type="body" selectable>
              {thought.challenge || SHRUG_EMOJI}
            </Typography>
          </View>
        </Link>
      </View>

      <View className="gap-1">
        <Typography type="h4">{t("alt_thought")}</Typography>
        <Link href={Routes.thoughtEditV2(thought.uuid, "alternative-thought")} asChild>
          <View className="flex-row items-center rounded-lg border border-border bg-surface-secondary p-2">
            {thought.alternativeThought ? (
              <>
                <Image source={ImagePath.pinkBubble} className="h-6 w-6 self-center mr-2" />
                <Typography type="body" selectable className="flex-1">
                  {thought.alternativeThought}
                </Typography>
              </>
            ) : (
              <Typography type="body">{SHRUG_EMOJI}</Typography>
            )}
          </View>
        </Link>
      </View>
    </Screen>
  );
}
