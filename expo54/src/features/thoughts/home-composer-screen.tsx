import { Screen } from "@/src/components";
import { HomeThoughtRecovery } from "./home-thought-recovery";
import { ThoughtEntryForm } from "./thought-entry-form";
import { useHomeThoughtDraft } from "./use-home-thought-draft";
import type { ModelLoadedProps } from "@/src/hooks/use-model";
import { Model, Thought } from "@/src/model";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { Button, Typography, useToast } from "heroui-native";
import React from "react";
import { BackHandler, Keyboard, Pressable, View } from "react-native";

/**
 * Home is the immediate thought-entry experience. It owns the durable draft, the
 * focus/tab-visibility policy and the recovery surface; the shared flow owns the
 * presentation. Home never navigates to a saved Thought - a save resets in place.
 */
export function HomeComposerScreen({ model, dispatch, translate: t }: ModelLoadedProps) {
  const [step, setStep] = React.useState(0);
  // a reset empties the input, so the flow must return to its first step too -
  // otherwise `step > 0` alone would keep the tabs hidden after a durable save.
  // the flow owns its own step, so remounting it is what puts it back to step 1.
  const [entryKey, setEntryKey] = React.useState(0);
  const { toast } = useToast();
  const draft = useHomeThoughtDraft({
    model,
    dispatch,
    onReset: (reason) => {
      setStep(0);
      setEntryKey((key) => key + 1);
      // a discard is the user's own choice, not a save result - no feedback Toast
      if (reason === "saved") {
        toast.show({
          variant: "success",
          label: t("cbt_form.thought_saved"),
          icon: <Feather name="check" size={16} />,
        });
      }
    },
    // an immediate, synchronous outbox-insertion failure: fire-and-forget Toast
    // feedback only. A later write/cleanup failure surfaces through the durable
    // recovery banner instead, since by then the user may have moved on.
    onFailure: (result) => {
      toast.show({
        variant: "danger",
        label: t(
          // a full outbox is not "something went wrong": nothing was attempted,
          // and the way out is resolving the records in the recovery surface
          result.stage === "capacity"
            ? "cbt_form.thought_save_capacity"
            : "cbt_form.thought_save_failed"
        ),
      });
    },
  });
  // a draft restored on mount is data, not intentional engagement: start paused
  // so the tabs stay visible until the user actually touches the flow. Read the
  // restore directly - `draft.spec` is already seeded from it by now.
  const [paused, setPaused] = React.useState(
    () => Model.restorableHomeThoughtDraft(model) !== null
  );
  const isSaving = model.thoughtSaveOutbox.some(
    (record) => record.status === "insertion-pending"
  );
  // focus is derived, so every control inside the flow keeps it by construction:
  // only an explicit pause (outside tap, staged Back) gives the tabs back.
  const focused =
    !paused && (Thought.isMeaningfulSpec(draft.spec) || step > 0);

  const pause = React.useCallback(() => {
    Keyboard.dismiss();
    setPaused(true);
  }, []);

  useTabBarHidden(focused);
  useStagedBack(focused, pause);

  return (
    <Screen
      testID="create-thought-screen"
      scroll={false}
      contentClassName="flex-1 gap-3"
    >
      <Pressable
        testID="thought-entry-outside"
        accessible={false}
        className="flex-1"
        onPress={pause}
      >
        <HomeThoughtRecovery model={model} dispatch={dispatch} translate={t} />
        {Thought.isMeaningfulSpec(draft.spec) && !draft.discarding ? (
          <Button
            testID="discard-draft"
            variant="tertiary"
            size="sm"
            className="self-end"
            onPress={draft.discard}
          >
            {t("cbt_form.discard_draft")}
          </Button>
        ) : null}
        {draft.discarding ? (
          <View
            testID="discard-draft-confirmation"
            accessibilityRole="alert"
            className="gap-2 rounded-lg border border-border bg-surface-secondary p-3"
          >
            <Typography type="body-sm">
              {t("cbt_form.discard_draft_confirm")}
            </Typography>
            <View className="flex-row gap-3">
              <Button
                testID="discard-draft-confirm"
                className="flex-1"
                onPress={draft.confirmDiscard}
              >
                {t("cbt_form.discard_draft_yes")}
              </Button>
              <Button
                testID="discard-draft-cancel"
                variant="secondary"
                className="flex-1"
                onPress={draft.cancelDiscard}
              >
                {t("cbt_form.discard_draft_no")}
              </Button>
            </View>
          </View>
        ) : null}
        <ThoughtEntryForm
          key={entryKey}
          route="home"
          translate={t}
          distortions={model.distortionData.list}
          value={draft.spec}
          isSaving={isSaving}
          onChange={draft.change}
          onSave={draft.submit}
          onStepChange={(_slide, index) => setStep(index)}
          onFocusRequest={() => setPaused(false)}
        />
      </Pressable>
    </Screen>
  );
}

/** Hide the tab bar while thought entry is focused, restore it on pause. */
function useTabBarHidden(hidden: boolean) {
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.setOptions({
      tabBarStyle: hidden ? { display: "none" } : undefined,
    });
  }, [hidden, navigation]);
}

/**
 * Staged platform Back: dismiss the keyboard first, pause second, and only then
 * let the platform/router handle it - so Back never drops entry work by surprise.
 */
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
