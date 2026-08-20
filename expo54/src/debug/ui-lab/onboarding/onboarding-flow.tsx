import { Screen, Section, SegmentedProgress } from "@/src/components";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { useTranslate } from "@/src/i18n/use-i18n";
import {
  completionFailure,
  completionIdle,
  completionSaving,
  slidesWithReminders,
  slidesWithoutReminders,
  type SlideName,
} from "./fixtures";
import React from "react";
import { Button, View } from "react-native";
import { Typography } from "heroui-native";

type CompletionState =
  | typeof completionIdle
  | typeof completionSaving
  | { readonly status: "failure"; readonly error: string };

export interface FlowState {
  readonly remindersSupported: boolean;
  readonly slides: readonly SlideName[];
  readonly activeIndex: number;
  readonly completion: CompletionState;
  readonly reminderChoice: "enabled" | "disabled" | null;
  readonly saveShouldFail: boolean;
}

export type FlowAction =
  | { readonly type: "NEXT" }
  | { readonly type: "BACK" }
  | { readonly type: "GET_STARTED" }
  | { readonly type: "RETRY" }
  | { readonly type: "SIMULATE_SAVE_FAILURE" }
  | { readonly type: "CHOOSE_REMINDERS"; readonly enabled: boolean }
  | { readonly type: "RESET"; readonly remindersSupported: boolean }
  | { readonly type: "SETTLE_SAVE" };

function slidesFor(remindersSupported: boolean) {
  return remindersSupported ? slidesWithReminders : slidesWithoutReminders;
}

function init(remindersSupported: boolean): FlowState {
  return {
    remindersSupported,
    slides: slidesFor(remindersSupported),
    activeIndex: 0,
    completion: completionIdle,
    reminderChoice: null,
    saveShouldFail: false,
  };
}

function clampIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "NEXT":
      return { ...state, activeIndex: clampIndex(state.activeIndex + 1, state.slides.length) };
    case "BACK":
      return { ...state, activeIndex: clampIndex(state.activeIndex - 1, state.slides.length) };
    case "GET_STARTED":
    case "RETRY":
      if (state.completion === completionSaving) return state;
      return { ...state, completion: completionSaving };
    case "SIMULATE_SAVE_FAILURE":
      return { ...state, saveShouldFail: true };
    case "CHOOSE_REMINDERS":
      return {
        ...state,
        reminderChoice: action.enabled ? "enabled" : "disabled",
      };
    case "RESET":
      return init(action.remindersSupported);
    case "SETTLE_SAVE":
      if (state.completion !== completionSaving) return state;
      if (state.saveShouldFail) {
        return {
          ...state,
          completion: { status: "failure", error: completionFailure.error },
          saveShouldFail: false,
        };
      }
      return {
        ...state,
        completion: completionIdle,
        saveShouldFail: false,
      };
    default:
      return state;
  }
}

export function useOnboardingFlow(remindersSupported: boolean) {
  return React.useReducer(reducer, remindersSupported, init);
}

export function OnboardingFlowPrototype(props: {
  readonly remindersSupported: boolean;
}) {
  const [state, dispatch] = useOnboardingFlow(props.remindersSupported);
  const s = useDefaultStyle();
  const t = useTranslate();

  React.useEffect(() => {
    if (state.completion !== completionSaving) return;
    const timer = setTimeout(() => {
      dispatch({ type: "SETTLE_SAVE" });
    }, 0);
    return () => clearTimeout(timer);
  }, [dispatch, state.completion]);

  const slide = state.slides[state.activeIndex];
  const hasReminders = slide === "reminders";
  const isSaving = state.completion === completionSaving;
  const hasFailed =
    typeof state.completion === "object" && state.completion.status === "failure";

  return (
    <Screen scroll={false} contentClassName="gap-4 py-4">
      <Section>
        <Text style={[s.text, s.subheader]}>Prototype state</Typography>
        <Text style={[s.text]}>Slide: {slide}</Typography>
        <Text style={[s.text]}>
          Completion:{" "}
          {hasFailed ? "failure" : isSaving ? "saving" : "idle"}
        </Typography>
        <Text style={[s.text]}>
          Reminders: {state.remindersSupported ? "supported" : "unsupported"}
        </Typography>
        <Text style={[s.text]}>
          Reminder choice: {state.reminderChoice ?? "none"}
        </Typography>
      </Section>

      <Section>
        <SegmentedProgress
          currentIndex={state.activeIndex}
          count={state.slides.length}
          accessibilityLabel="Onboarding progress"
        />

        <Text style={[s.text, s.my2]}>Step {state.activeIndex + 1} of {state.slides.length}</Typography>
        <View style={[s.my2]}>
          {slide === "record" ? (
            <>
              <Text style={[s.text, s.subheader]}>{t("onboarding_screen.readme")}</Typography>
              <Text style={[s.text]}>{t("onboarding_screen.header")}</Typography>
            </>
          ) : null}
          {slide === "challenge" ? (
            <>
              <Text style={[s.text, s.subheader]}>{t("onboarding_screen.block1.header")}</Typography>
              <Text style={[s.text]}>{t("onboarding_screen.block1.body")}</Typography>
            </>
          ) : null}
          {slide === "change" ? (
            <>
              <Text style={[s.text, s.subheader]}>{t("onboarding_screen.block2.header")}</Typography>
              <Text style={[s.text]}>{t("onboarding_screen.block2.body")}</Typography>
            </>
          ) : null}
          {hasReminders ? (
            <>
              <Text style={[s.text, s.subheader]}>{t("onboarding_screen.reminders.header")}</Typography>
              <Text style={[s.text]}>
                {state.reminderChoice === "enabled"
                  ? "Reminders: enabled"
                  : state.reminderChoice === "disabled"
                    ? "Reminders: disabled"
                    : "Choose whether reminders should be enabled."}
              </Typography>
            </>
          ) : null}
        </View>
      </Section>

      <Section>
        <View style={[s.flexRow]}>
          <View style={[s.mx1, s.flex1]}>
            <Button
              title="Back"
              disabled={state.activeIndex === 0}
              onPress={() => dispatch({ type: "BACK" })}
            />
          </View>
          <View style={[s.mx1, s.flex1]}>
            <Button
              title="Next"
              disabled={state.activeIndex >= state.slides.length - 1}
              onPress={() => dispatch({ type: "NEXT" })}
            />
          </View>
        </View>

        {!hasReminders ? null : (
          <View style={[s.flexRow, s.mt2]}>
            <View style={[s.mx1, s.flex1]}>
              <Button
                title={t("onboarding_screen.reminders.button.yes")}
                onPress={() =>
                  dispatch({
                    type: "CHOOSE_REMINDERS",
                    enabled: true,
                  })
                }
              />
            </View>
            <View style={[s.mx1, s.flex1]}>
              <Button
                title={t("onboarding_screen.reminders.button.no")}
                onPress={() =>
                  dispatch({
                    type: "CHOOSE_REMINDERS",
                    enabled: false,
                  })
                }
              />
            </View>
          </View>
        )}

        <View style={[s.mt2]}>
          {hasFailed ? (
            <Text style={[s.text, s.my2]}>Unable to save. Try again.</Typography>
          ) : null}
          <Button
            title={hasFailed ? "Retry" : isSaving ? "Saving..." : "Get started"}
            disabled={isSaving}
            onPress={() =>
              dispatch({ type: hasFailed ? "RETRY" : "GET_STARTED" })
            }
          />
        </View>

        <View style={[s.flexRow, s.mt2]}>
          <View style={[s.mx1, s.flex1]}>
            <Button
              title="Simulate save failure"
              onPress={() => dispatch({ type: "SIMULATE_SAVE_FAILURE" })}
            />
          </View>
          <View style={[s.mx1, s.flex1]}>
            <Button
              title="Reset flow"
              onPress={() =>
                dispatch({
                  type: "RESET",
                  remindersSupported: state.remindersSupported,
                })
              }
            />
          </View>
        </View>
      </Section>
    </Screen>
  );
}
