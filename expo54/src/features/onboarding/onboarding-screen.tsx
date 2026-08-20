import { Routes } from "@/src";
import { FlowAction, FlowProgress, Screen } from "@/src/components";
import { TopBar } from "@/src/components/layout/top-bar";
import { Reminders, useReminders } from "@/src/features/reminders/use-reminders";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { Link, useRouter } from "expo-router";
import { Button, Typography, useThemeColor } from "heroui-native";
import React from "react";
import {
  AccessibilityInfo,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
} from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { onboardingSteps, type OnboardingStep } from "./onboarding-content";
import { OnboardingPage } from "./onboarding-page";

const stepsWithoutReminders = onboardingSteps.filter((step) => step.id !== "reminders");

export type OnboardingScreenProps = ModelLoadedProps & {
  onSkip: () => void;
};

export function OnboardingScreen(props: OnboardingScreenProps) {
  const ref = React.useRef<ICarouselInstance>(null);
  const completionRequested = React.useRef(false);
  const transitionPending = React.useRef(false);
  const announcedIndex = React.useRef(0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [pagerSize, setPagerSize] = React.useState<{ width: number; height: number }>();
  const router = useRouter();
  const reminders = useReminders();
  const accent = useThemeColor("accent");
  const isSaving = props.model.onboardingCompletion === "saving";
  const hasFailed =
    typeof props.model.onboardingCompletion === "object" &&
    props.model.onboardingCompletion.status === "failure";
  const slides = reminders.isSupported() ? onboardingSteps : stepsWithoutReminders;
  const isFinal = activeIndex === slides.length - 1;
  const showFailure = isFinal && hasFailed;

  React.useEffect(() => {
    if (completionRequested.current && props.model.onboardingCompletion === "idle") {
      completionRequested.current = false;
      router.push(Routes.homeV2());
    }
  }, [props.model.onboardingCompletion, router]);

  function onPressGetStarted() {
    if (isSaving) return;
    completionRequested.current = true;
    props.dispatch(Action.beginOnboardingCompletion());
  }

  function onPressStep(count: -1 | 1) {
    if (
      transitionPending.current ||
      (count < 0 && activeIndex === 0) ||
      (count > 0 && isFinal) ||
      ref.current === null
    ) {
      return;
    }

    transitionPending.current = true;
    ref.current.scrollTo({ count, animated: true });
  }

  function onPagerLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width === 0 || height === 0) return;

    setPagerSize((current) =>
      current?.width === width && current.height === height ? current : { width, height }
    );
  }

  const footer = (
    <View className="items-center gap-3">
      <FlowProgress
        variant="dots"
        currentIndex={activeIndex}
        count={slides.length}
        accessibilityLabel={props.translate("onboarding_screen.progress")}
        accessibilityValueText={props.translate("onboarding_screen.progress_step", {
          step: activeIndex + 1,
          count: slides.length,
        })}
      />
      <View
        testID="onboarding-failure-region"
        accessibilityElementsHidden={!showFailure}
        importantForAccessibility={showFailure ? "auto" : "no-hide-descendants"}
      >
        <Typography
          type="body-sm"
          className="text-danger"
          style={{ opacity: showFailure ? 1 : 0 }}
        >
          {props.translate("onboarding_screen.save_failed")}
        </Typography>
      </View>
      <View className="h-12 w-40 items-center">
        <FlowAction
          state={isFinal ? "final" : "next"}
          onPress={isFinal ? onPressGetStarted : () => onPressStep(1)}
          isDisabled={isFinal && isSaving}
          accessibilityLabel={
            isFinal
              ? props.translate(
                  isSaving ? "onboarding_screen.saving" : "onboarding_screen.get_started"
                )
              : props.translate("onboarding_screen.next")
          }
          finalLabel={props.translate(
            isSaving ? "onboarding_screen.saving" : "onboarding_screen.get_started"
          )}
        />
      </View>
    </View>
  );

  return (
    <Screen scroll={false} contentClassName="flex-1 gap-0 py-2" footer={footer}>
      <View className="flex-1">
        <TopBar
          onBack={activeIndex > 0 ? () => onPressStep(-1) : undefined}
          backAccessibilityLabel={props.translate("onboarding_screen.previous")}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.translate("onboarding_screen.skip")}
              className="items-center justify-center"
              style={{ width: 44, height: 44 }}
              onPress={props.onSkip}
            >
              <Typography type="body-sm" style={{ color: accent }}>
                {props.translate("onboarding_screen.skip")}
              </Typography>
            </Pressable>
          }
        />

        <View
          testID="onboarding-pager-viewport"
          className="min-h-0 flex-1 overflow-hidden"
          onLayout={onPagerLayout}
        >
          {pagerSize ? (
            <Carousel
              ref={ref}
              data={[...slides]}
              renderItem={({ item, index }) => {
                const isActive = index === activeIndex;
                return (
                  <View
                    testID={`onboarding-page-${item.id}`}
                    accessibilityElementsHidden={!isActive}
                    aria-hidden={!isActive}
                    importantForAccessibility={
                      isActive ? "auto" : "no-hide-descendants"
                    }
                    focusable={isActive ? undefined : false}
                    tabIndex={isActive ? undefined : -1}
                    {...(Platform.OS === "web" && !isActive
                      ? ({ inert: true } as unknown as React.ComponentProps<typeof View>)
                      : {})}
                    style={{ width: "100%", flex: 1 }}
                  >
                    <OnboardingItem
                      step={item}
                      dispatch={props.dispatch}
                      reminders={reminders}
                      translate={props.translate}
                    />
                  </View>
                );
              }}
              width={pagerSize.width}
              height={pagerSize.height}
              loop={false}
              defaultIndex={0}
              onSnapToItem={(index) => {
                transitionPending.current = false;
                setActiveIndex(index);
                if (announcedIndex.current !== index) {
                  announcedIndex.current = index;
                  AccessibilityInfo.announceForAccessibility(
                    props.translate(slides[index].titleKey)
                  );
                }
                Keyboard.dismiss();
              }}
              onConfigurePanGesture={(gesture) => {
                "worklet";
                gesture.activeOffsetX([-10, 10]);
              }}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function OnboardingItem(
  props: Pick<ModelLoadedProps, "dispatch" | "translate"> & {
    reminders: Reminders;
    step: OnboardingStep;
  }
) {
  const { dispatch, reminders, step, translate: t } = props;

  switch (step.presentation) {
    case "guide":
      return <OnboardingPage step={step} translate={t} variation={<GuideVariation translate={t} />} />;
    case "informational":
      return <OnboardingPage step={step} translate={t} variation={null} />;
    case "reminders":
      return (
        <OnboardingPage
          step={step}
          translate={t}
          variation={<ReminderVariation reminders={reminders} dispatch={dispatch} translate={t} />}
        />
      );
    default:
      throw new Error(`unknown presentation: ${step.presentation satisfies never}`);
  }
}

function GuideVariation({ translate: t }: Pick<ModelLoadedProps, "translate">) {
  return (
    <Link
      asChild
      href="https://freecbt.erosson.org/explanation/?ref=quirk"
      accessibilityLabel={t("onboarding_screen.header")}
    >
      <Button variant="secondary">{t("onboarding_screen.header")}</Button>
    </Link>
  );
}

function ReminderVariation(
  props: Pick<ModelLoadedProps, "dispatch" | "translate"> & { reminders: Reminders }
) {
  const { dispatch, reminders, translate: t } = props;

  return (
    <View className="w-full gap-3">
      <Button onPress={() => void reminders.enable(dispatch, t)}>
        {t("onboarding_screen.reminders.button.yes")}
      </Button>
      <Button variant="secondary" onPress={() => void reminders.disable(dispatch)}>
        {t("onboarding_screen.reminders.button.no")}
      </Button>
    </View>
  );
}
