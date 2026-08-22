import { useTranslate } from "@/i18n/use-i18n";
import { Distortion, DistortionData, Thought } from "@/model";
import { StandardScreen } from "@/shared/components";
import { useThoughtEntryForm } from "@/features/thoughts/thought-entry-form";
import { Button, Typography, useToast } from "heroui-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React from "react";
import { BackHandler, Keyboard, Pressable, View } from "react-native";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { useThoughtWizardSession } from "../store/useThoughtWizardSession";

export function ThoughtHomeComposerScreen() {
  const t = useTranslate();
  const [attempt, setAttempt] = React.useState(0);
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setIsReady(false);
    setError(false);
    void ensureThoughtRecordReady()
      .then(() => useThoughtWizardSession.persist.rehydrate())
      .then(() => {
        if (active) setIsReady(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <StandardScreen>
        <View className="gap-2">
          <Typography type="body-sm">{t("cbt_form.thought_load_failed")}</Typography>
          <Button testID="thought-home-retry" variant="secondary" onPress={() => setAttempt((value) => value + 1)}>
            {t("cbt_form.retry")}
          </Button>
        </View>
      </StandardScreen>
    );
  }

  return isReady ? <ReadyThoughtHomeComposerScreen /> : null;
}

function ReadyThoughtHomeComposerScreen() {
  const t = useTranslate();
  const session = useThoughtWizardSession();
  const { toast } = useToast();
  const initialStep = Math.max(0, Thought.SlideName.options.indexOf(session.currentSlide));
  const [step, setStep] = React.useState(initialStep);
  const [entryKey, setEntryKey] = React.useState(0);
  const [paused, setPaused] = React.useState(initialStep === 0);
  const [discarding, setDiscarding] = React.useState(false);
  const saving = React.useRef(false);
  const value = React.useMemo(
    () => ({
      automaticThought: session.automaticThought,
      cognitiveDistortions: Distortion.createParsers(DistortionData).fromSlugSet.decode(
        new Set(session.selectedDistortionSlugs)
      ),
      challenge: session.challenge,
      alternativeThought: session.alternativeThought,
    }),
    [
      session.alternativeThought,
      session.automaticThought,
      session.challenge,
      session.selectedDistortionSlugs,
    ]
  );
  const focused = !paused && (Thought.isMeaningfulSpec(value) || step > 0);

  const pause = React.useCallback(() => {
    Keyboard.dismiss();
    setPaused(true);
  }, []);

  const save = React.useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await session.saveRecord();
      if (result.status === "saved") {
        setStep(0);
        setEntryKey((key) => key + 1);
        toast.show({
          variant: "success",
          label: t("cbt_form.thought_saved"),
          icon: <Feather name="check" size={16} />,
        });
      } else if (result.status === "failed") {
        toast.show({ variant: "danger", label: t("cbt_form.thought_save_failed") });
      }
    } finally {
      saving.current = false;
    }
  }, [session, t, toast]);

  const change = React.useCallback(
    (next: Thought.Spec) => {
      setPaused(false);
      session.setAutomaticThought(next.automaticThought);
      session.setChallenge(next.challenge);
      session.setAlternativeThought(next.alternativeThought);
      const selected = new Set<string>(
        [...next.cognitiveDistortions].map((distortion) => distortion.slug)
      );
      for (const slug of session.selectedDistortionSlugs) {
        if (!selected.has(slug)) session.toggleDistortion(slug);
      }
      for (const slug of selected) {
        if (!session.selectedDistortionSlugs.includes(slug)) session.toggleDistortion(slug);
      }
    },
    [session]
  );

  const discard = React.useCallback(() => {
    session.reset();
    setDiscarding(false);
    setPaused(true);
    setStep(0);
    setEntryKey((key) => key + 1);
  }, [session]);

  useTabBarHidden(focused);
  useStagedBack(focused, pause);

  const { body, actions } = useThoughtEntryForm({
    route: "home",
    resetKey: entryKey,
    slide: session.currentSlide,
    translate: t,
    distortions: DistortionData.list,
    value,
    isSaving: session.isSaving,
    saveError: session.error === null ? null : t("cbt_form.thought_save_failed"),
    onChange: change,
    onSave: () => void save(),
    onRetry: () => void save(),
    onStepChange: (slide, index) => {
      session.setSlide(slide);
      setStep(index);
    },
    onFocusRequest: () => setPaused(false),
  });

  return (
    <StandardScreen
      testID="create-thought-screen"
      scrollable={false}
      contentClassName="flex-1 gap-3"
      footer={actions}
    >
      <Pressable
        testID="thought-entry-outside"
        accessible={false}
        className="flex-1"
        onPress={pause}
      >
        {Thought.isMeaningfulSpec(value) && !discarding ? (
          <Button
            testID="discard-draft"
            variant="tertiary"
            size="sm"
            className="self-end"
            onPress={() => setDiscarding(true)}
          >
            {t("cbt_form.discard_draft")}
          </Button>
        ) : null}
        {discarding ? (
          <View
            testID="discard-draft-confirmation"
            accessibilityRole="alert"
            className="gap-2 rounded-lg border border-border bg-surface-secondary p-3"
          >
            <Typography type="body-sm">{t("cbt_form.discard_draft_confirm")}</Typography>
            <View className="flex-row gap-3">
              <Button testID="discard-draft-confirm" className="flex-1" onPress={discard}>
                {t("cbt_form.discard_draft_yes")}
              </Button>
              <Button
                testID="discard-draft-cancel"
                variant="secondary"
                className="flex-1"
                onPress={() => setDiscarding(false)}
              >
                {t("cbt_form.discard_draft_no")}
              </Button>
            </View>
          </View>
        ) : null}
        {body}
      </Pressable>
    </StandardScreen>
  );
}

function useTabBarHidden(hidden: boolean) {
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.setOptions({ tabBarStyle: hidden ? { display: "none" } : undefined });
  }, [hidden, navigation]);
}

function useStagedBack(focused: boolean, pause: () => void) {
  const keyboardOpen = React.useRef(false);
  React.useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      keyboardOpen.current = true;
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpen.current = false;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  React.useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (keyboardOpen.current) {
        Keyboard.dismiss();
        return true;
      }
      if (focused) {
        pause();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [focused, pause]);
}
