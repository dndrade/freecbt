import * as ImagePath from "@/src/assets/image-path";
import { SegmentedProgress } from "@/src/components/segmented-progress";
import type { TranslateFn } from "@/src/i18n/use-i18n";
import { Distortion, Thought } from "@/src/model";
import { Image } from "expo-image";
import {
  Button,
  Card,
  Checkbox,
  Label,
  Switch,
  TextArea,
  TextField,
  Typography,
} from "heroui-native";
import React from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";

const steps = Thought.SlideName.options;

/**
 * Which screen is hosting the flow. The flow itself owns presentation and
 * business interaction only - never navigation policy or draft persistence,
 * both of which differ per route and stay with the wrapper screens.
 */
export type ThoughtEntryRoute = "home" | "compatibility";

export interface ThoughtEntryFormProps {
  route: ThoughtEntryRoute;
  translate: TranslateFn;
  distortions: readonly Distortion.Distortion[];
  value: Thought.Spec;
  onChange?: (spec: Thought.Spec) => void;
  /** Save is the wrapper's business: Home persists in place, compatibility navigates. */
  onSave?: () => void;
  onRetry?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
  /** Initial step; used by the edit flow to open on one field. */
  slide?: Thought.SlideName;
  onStepChange?: (slide: Thought.SlideName, index: number) => void;
  /** Any interaction with a control inside the flow: the wrapper keeps/returns focus. */
  onFocusRequest?: () => void;
  /** Changing this resets the form back to its first step - the hook's
   *  replacement for the old `<ThoughtEntryForm key={entryKey}>` remount. */
  resetKey?: string | number;
}

export function useThoughtEntryForm(props: ThoughtEntryFormProps): {
  body: React.ReactNode;
  actions: React.ReactNode;
} {
  const { translate: t, value, isSaving = false, saveError = null } = props;
  const initialIndex = Math.max(0, steps.indexOf(props.slide ?? steps[0]));
  const [index, setIndex] = React.useState(initialIndex);
  const [showDetails, setShowDetails] = React.useState(false);
  const focus = props.onFocusRequest ?? (() => {});
  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Reset to the first step whenever the caller's resetKey changes - the
  // hook equivalent of remounting `<ThoughtEntryForm key={entryKey}>`.
  React.useEffect(() => {
    setIndex(initialIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.resetKey]);

  function go(to: number) {
    const clamped = Math.min(steps.length - 1, Math.max(0, to));
    if (clamped === index) return;
    Keyboard.dismiss();
    setIndex(clamped);
    focus();
    props.onStepChange?.(steps[clamped], clamped);
  }

  function edit(patch: Partial<Thought.Spec>) {
    focus();
    props.onChange?.({ ...value, ...patch });
  }

  function field(
    key: "automatic-thought" | "challenge" | "alternative-thought",
    label: string,
    placeholder: string,
    text: string,
    onChangeText: (v: string) => void,
    description?: string
  ) {
    return (
      <TextField>
        <Label>{label}</Label>
        {description ? (
          <Typography type="body-sm" color="muted">
            {description}
          </Typography>
        ) : null}
        <TextArea
          testID={`${key}-input`}
          accessibilityLabel={label}
          placeholder={placeholder}
          value={text}
          numberOfLines={6}
          onFocus={focus}
          onChangeText={onChangeText}
        />
      </TextField>
    );
  }

  function content() {
    switch (step) {
      case "automatic-thought":
        return field(
          "automatic-thought",
          t("auto_thought"),
          t("cbt_form.auto_thought_placeholder"),
          value.automaticThought,
          (v) => edit({ automaticThought: v })
        );
      case "distortions":
        return (
          <View testID="distortions-step" className="gap-4">
            <Typography type="h4" accessibilityRole="header">
              {t("cog_distortion")}
            </Typography>
            <View className="flex-row items-center justify-between gap-3">
              <Typography type="body-sm" color="muted" className="flex-1">
                {t("cbt_form.show_details")}
              </Typography>
              <Switch
                testID="distortion-details-toggle"
                accessibilityLabel={t("cbt_form.show_details")}
                isSelected={showDetails}
                onSelectedChange={(v) => {
                  focus();
                  setShowDetails(v);
                }}
              />
            </View>
            <View className="gap-3 pl-3">
              {props.distortions.map((d, i) => (
                <DistortionRow
                  key={d.slug}
                  distortion={d}
                  image={ImagePath.bubbles[i % ImagePath.bubbles.length]}
                  translate={t}
                  showDetails={showDetails}
                  isSelected={value.cognitiveDistortions.has(d)}
                  onToggle={() => {
                    const next = new Set(value.cognitiveDistortions);
                    if (!next.delete(d)) next.add(d);
                    edit({ cognitiveDistortions: next });
                  }}
                />
              ))}
            </View>
          </View>
        );
      case "challenge":
        return field(
          "challenge",
          t("challenge"),
          t("cbt_form.changed_placeholder"),
          value.challenge,
          (v) => edit({ challenge: v })
        );
      case "alternative-thought":
        return field(
          "alternative-thought",
          t("alt_thought"),
          t("cbt_form.alt_thought_placeholder"),
          value.alternativeThought,
          (v) => edit({ alternativeThought: v }),
          t("alt_thought_description")
        );
      default:
        throw new Error(`unknown slide: ${step satisfies never}`);
    }
  }

  const body = (
    <View testID={`thought-entry-form-${props.route}`} className="flex-1">
      <View
        testID="thought-entry-content"
        className="flex-1 w-full max-w-xl self-center gap-4 px-2"
      >
        <View testID="thought-entry-progress" className="w-full">
          <SegmentedProgress
            currentIndex={index}
            count={steps.length}
            accessibilityLabel={t("cbt_form.step_progress", {
              step: index + 1,
              count: steps.length,
            })}
          />
        </View>
        <ScrollView
          className="flex-1 w-full"
          contentContainerClassName="grow gap-3 pb-4"
          keyboardShouldPersistTaps="handled"
        >
          {content()}
        </ScrollView>
        {saveError !== null ? (
          <View
            testID="thought-entry-save-error"
            accessibilityRole="alert"
            className="w-full gap-2"
          >
            <Typography type="body-sm" className="text-danger">
              {saveError}
            </Typography>
            {props.onRetry ? (
              <Button
                testID="thought-entry-retry"
                variant="secondary"
                onPress={props.onRetry}
              >
                {t("cbt_form.retry")}
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  const actions = (
    <View
      testID="thought-entry-actions"
      className="w-full flex-row items-center justify-between gap-3"
    >
      <Button
        testID="thought-entry-previous"
        variant="secondary"
        className="flex-1"
        isDisabled={index === 0}
        accessibilityLabel={t("cbt_form.previous")}
        onPress={() => go(index - 1)}
      >
        {t("cbt_form.previous")}
      </Button>
      {isLast ? (
        <Button
          testID="thought-entry-save"
          className="flex-1"
          isDisabled={isSaving}
          onPress={() => {
            if (isSaving) return;
            props.onSave?.();
          }}
        >
          {isSaving ? t("cbt_form.saving") : t("cbt_form.submit")}
        </Button>
      ) : (
        <Button
          testID="thought-entry-next"
          className="flex-1"
          accessibilityLabel={t("cbt_form.next")}
          onPress={() => go(index + 1)}
        >
          {t("cbt_form.next")}
        </Button>
      )}
    </View>
  );

  return { body, actions };
}

function DistortionRow(props: {
  distortion: Distortion.Distortion;
  image: (typeof ImagePath.bubbles)[number];
  translate: TranslateFn;
  showDetails: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { distortion: d, translate: t, isSelected } = props;
  const name = t(d.labelKey);
  return (
    <Pressable
      testID={`distortion-${d.slug}`}
      className="w-full"
      accessibilityRole="checkbox"
      accessibilityLabel={name}
      accessibilityState={{ checked: isSelected }}
      onPress={props.onToggle}
    >
      <Card
        testID={`distortion-card-${d.slug}`}
        className={`w-full ${isSelected ? "border-accent bg-surface-tertiary" : ""}`}
      >
        <Card.Body
          className={`flex-row items-start ${props.showDetails ? "gap-3" : "gap-2"}`}
        >
          <View
            accessible={false}
            className="h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary"
          >
            <Typography type="h4">{Distortion.emoji(d)}</Typography>
          </View>
          <View className={`flex-1 ${props.showDetails ? "gap-2" : "gap-1"}`}>
            <Card.Title>{name}</Card.Title>
            {props.showDetails ? (
              <>
                <Card.Description>
                  {d.explanationKeys.map((k) => t(k)).join("\n\n")}
                </Card.Description>
                <View className="flex-row items-center gap-2">
                  <Image source={props.image} className="h-12 w-12" />
                  <Card.Description className="flex-1">
                    {t(d.explanationThoughtKey)}
                  </Card.Description>
                </View>
              </>
            ) : (
              <Card.Description>{t(d.descriptionKey)}</Card.Description>
            )}
          </View>
          <Checkbox
            isSelected={isSelected}
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Card.Body>
      </Card>
    </Pressable>
  );
}
