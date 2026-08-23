import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { Distortion, DistortionData, Thought } from "@/model";
import {
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useThoughtEntryForm } from "@/features/thoughts/thought-entry-form";
import { useThoughtWizardSession } from "../store/useThoughtWizardSession";
import { useRouter } from "expo-router";
import React from "react";

export function ThoughtCreateScreen() {
  const t = useTranslate();
  const router = useRouter();
  const session = useThoughtWizardSession();
  const mounted = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const value = React.useMemo(
    () => ({
      automaticThought: session.automaticThought,
      cognitiveDistortions: Distortion.createParsers(
        DistortionData,
      ).fromSlugSet.decode(new Set(session.selectedDistortionSlugs)),
      challenge: session.challenge,
      alternativeThought: session.alternativeThought,
    }),
    [
      session.alternativeThought,
      session.automaticThought,
      session.challenge,
      session.selectedDistortionSlugs,
    ],
  );

  const change = React.useCallback(
    (next: Thought.Spec) => {
      session.setAutomaticThought(next.automaticThought);
      session.setChallenge(next.challenge);
      session.setAlternativeThought(next.alternativeThought);
      const selected = new Set<string>(
        [...next.cognitiveDistortions].map((distortion) => distortion.slug),
      );
      for (const slug of session.selectedDistortionSlugs) {
        if (!selected.has(slug)) session.toggleDistortion(slug);
      }
      for (const slug of selected) {
        if (!session.selectedDistortionSlugs.includes(slug))
          session.toggleDistortion(slug);
      }
    },
    [session],
  );

  const save = React.useCallback(async () => {
    const result = await session.saveRecord();
    if (result.status === "saved" && mounted.current) {
      router.replace(Routes.thoughtViewV2(result.thought.uuid));
    }
  }, [router, session]);

  const { body, actions } = useThoughtEntryForm({
    route: "compatibility",
    translate: t,
    distortions: DistortionData.list,
    value,
    onChange: change,
    onSave: save,
    onRetry: save,
    isSaving: session.isSaving,
    saveError:
      session.error === null ? null : t("cbt_form.thought_save_failed"),
  });

  useScreenHeader({
    title: t("cbt_form.new"),
    leftAction: backHeaderAction(() => router.back()),
  });

  return (
    <StandardScreen
      scrollable={false}
      contentClassName="flex-1 gap-3"
      footer={actions}
    >
      {body}
    </StandardScreen>
  );
}
