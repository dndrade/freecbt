import React from "react";
import { Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Typography } from "heroui-native";
import {
  ErrorBoundary,
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";
import { isKnownStepId, NO_SWIPE_STEP_IDS, stepRegistry } from "../steps";

export type OnboardingScreenProps = {
  onSkip: () => void | Promise<void>;
  onComplete: () => void | Promise<void>;
};

const TRANSITION_DURATION = 200;

function isTerminalStep(stepId: string) {
  return stepId === "composer" || stepId === "g-your-turn";
}

export function OnboardingScreen({
  onSkip,
  onComplete,
}: OnboardingScreenProps) {
  const t = useTranslate();
  const currentStepId = useOnboardingFlow((state) => state.currentStepId);
  const history = useOnboardingFlow((state) => state.history);
  const revealed = useOnboardingFlow((state) => state.revealed);
  const selectedDistortionSlugs = useOnboardingFlow(
    (state) => state.selectedDistortionSlugs,
  );
  const selectedEvidenceIds = useOnboardingFlow(
    (state) => state.selectedEvidenceIds,
  );
  const guidedAlternative = useOnboardingFlow(
    (state) => state.guidedAlternative,
  );
  const composerThought = useOnboardingFlow((state) => state.composerThought);
  const guidedPersonalThought = useOnboardingFlow(
    (state) => state.guidedPersonalThought,
  );
  const isSaving = useOnboardingFlow((state) => state.isSaving);
  const error = useOnboardingFlow((state) => state.error);
  const next = useOnboardingFlow((state) => state.next);
  const back = useOnboardingFlow((state) => state.back);
  const reveal = useOnboardingFlow((state) => state.reveal);
  const finishOnboarding = useOnboardingFlow((state) => state.finishOnboarding);

  const [direction, setDirection] = React.useState<"forward" | "back">(
    "forward",
  );
  const wasSaving = React.useRef(isSaving);
  const terminalSaveStep = React.useRef<string | undefined>(undefined);
  const completionReported = React.useRef(false);
  const skipPending = React.useRef(false);

  React.useEffect(() => {
    if (isSaving && isTerminalStep(currentStepId) && !skipPending.current) {
      terminalSaveStep.current = currentStepId;
    }
    if (
      wasSaving.current &&
      !isSaving &&
      terminalSaveStep.current &&
      !error &&
      currentStepId === "welcome" &&
      !skipPending.current &&
      !completionReported.current
    ) {
      completionReported.current = true;
      void onComplete();
    }
    wasSaving.current = isSaving;
  }, [currentStepId, error, isSaving, onComplete]);

  const forwardReady =
    currentStepId === "g-pattern"
      ? selectedDistortionSlugs.length > 0
      : currentStepId === "g-evidence"
        ? selectedEvidenceIds.length > 0
        : currentStepId === "g-alternative"
          ? guidedAlternative.trim().length > 0
          : currentStepId === "composer"
            ? composerThought.trim().length > 0
            : currentStepId === "g-your-turn"
              ? guidedPersonalThought.trim().length > 0
              : true;

  const finishAndComplete = React.useCallback(async () => {
    if (completionReported.current || isSaving) return;
    const result = await finishOnboarding();
    if (result.status === "saved" && !completionReported.current) {
      completionReported.current = true;
      await onComplete();
    }
  }, [finishOnboarding, isSaving, onComplete]);

  const goNext = React.useCallback(() => {
    if (currentStepId === "g-thought" && !revealed) {
      reveal();
      return;
    }
    if (!forwardReady) return;
    if (isTerminalStep(currentStepId)) {
      void finishAndComplete();
      return;
    }
    setDirection("forward");
    next();
  }, [currentStepId, finishAndComplete, forwardReady, next, reveal, revealed]);

  const goBack = React.useCallback(() => {
    if (history.length === 0) return;
    setDirection("back");
    back();
  }, [back, history.length]);

  const handleSkip = React.useCallback(async () => {
    if (skipPending.current) return;
    skipPending.current = true;
    terminalSaveStep.current = undefined;
    const result = await finishOnboarding();
    if (result.status === "saved" || result.status === "empty") {
      await onSkip();
    } else {
      skipPending.current = false;
    }
  }, [finishOnboarding, onSkip]);

  const knownStep = isKnownStepId(currentStepId);
  const StepComponent = knownStep ? stepRegistry[currentStepId] : null;
  const swipeDisabled = knownStep && NO_SWIPE_STEP_IDS.has(currentStepId);
  const pan = Gesture.Pan()
    .enabled(!swipeDisabled)
    .onEnd((event) => {
      "worklet";
      if (event.translationX < -40) scheduleOnRN(goNext);
      if (event.translationX > 40) scheduleOnRN(goBack);
    });

  useScreenHeader({
    leftAction:
      history.length > 0
        ? backHeaderAction(goBack, {
            accessibilityLabel: t("onboarding_screen.back"),
          })
        : undefined,
    rightElement: (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("onboarding_screen.skip")}
        className="items-center justify-center"
        style={{ minWidth: 48, height: 48, paddingHorizontal: 8 }}
        onPress={() => void handleSkip()}
      >
        <Typography type="body-sm">{t("onboarding_screen.skip")}</Typography>
      </Pressable>
    ),
  });

  if (!StepComponent) return null;

  return (
    <StandardScreen scrollable={false} contentClassName="flex-1">
      <GestureDetector gesture={pan}>
        <Animated.View
          key={currentStepId}
          testID={`onboarding-step-${currentStepId}`}
          entering={(direction === "forward" ? SlideInRight : SlideInLeft)
            .duration(TRANSITION_DURATION)
            .reduceMotion(ReduceMotion.System)}
          exiting={(direction === "forward" ? SlideOutLeft : SlideOutRight)
            .duration(TRANSITION_DURATION)
            .reduceMotion(ReduceMotion.System)}
          style={{ flex: 1 }}
        >
          <ErrorBoundary
            fallback={null}
            onError={(error) => {
              if (__DEV__) {
                console.warn(
                  `onboarding step "${currentStepId}" failed to render:`,
                  error,
                );
              }
            }}
          >
            <StepComponent />
          </ErrorBoundary>
        </Animated.View>
      </GestureDetector>
    </StandardScreen>
  );
}
