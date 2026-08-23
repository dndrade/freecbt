import React, { useRef, useState } from "react";
import {
  AccessibilityInfo,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
} from "react-native";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { Typography, useThemeColor } from "heroui-native";

import {
  ErrorBoundary,
  FlowAction,
  FlowProgress,
  StandardScreen,
  backHeaderAction,
} from "@/shared/components";
import { useReminders } from "@/features/reminders/use-reminders";
import { useI18n } from "@/i18n/use-i18n";
import { useOnboardingFlow } from "../store/useOnboardingFlow";
import { buildOnboardingSteps, type OnboardingStepDefinition } from "../steps";

export type OnboardingScreenProps = {
  onSkip: () => void | Promise<void>;
  onComplete: () => void | Promise<void>;
};

export function OnboardingScreen({
  onSkip,
  onComplete,
}: OnboardingScreenProps) {
  const ref = useRef<ICarouselInstance>(null);
  const transitionPending = useRef(false);
  const announcedIndex = useRef(0);
  const [pagerSize, setPagerSize] = useState<{
    width: number;
    height: number;
  }>();

  const i18n = useI18n();
  const t = (key: string, opts?: any) => i18n.t(key, opts);
  const reminders = useReminders();
  const accent = useThemeColor("accent");

  const activeIndex = useOnboardingFlow((s) => s.activeIndex);
  const setActiveIndex = useOnboardingFlow((s) => s.setActiveIndex);
  const finish = useOnboardingFlow((s) => s.finish);

  const slides = buildOnboardingSteps({
    includeReminders: reminders.isSupported(),
  });
  const isFinal = activeIndex === slides.length - 1;

  const complete = async (callback: () => void | Promise<void>) => {
    await finish();
    if (useOnboardingFlow.getState().completion === "idle") {
      await callback();
    }
  };

  const handleFinish = () => complete(onComplete);
  const handleSkip = () => complete(onSkip);

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
      current?.width === width && current.height === height
        ? current
        : { width, height },
    );
  }

  const footer = (
    <View className="items-center gap-3 pb-4">
      <FlowProgress
        variant="dots"
        currentIndex={activeIndex}
        count={slides.length}
        accessibilityLabel={t("onboarding_screen.progress")}
        accessibilityValueText={t("onboarding_screen.progress_step", {
          step: activeIndex + 1,
          count: slides.length,
        })}
      />
      <View className="h-12 w-48 items-center">
        <FlowAction
          state={isFinal ? "final" : "next"}
          onPress={isFinal ? handleFinish : () => onPressStep(1)}
          accessibilityLabel={
            isFinal
              ? t("onboarding_screen.get_started")
              : t("onboarding_screen.next")
          }
          finalLabel={t("onboarding_screen.get_started")}
        />
      </View>
    </View>
  );

  return (
    <StandardScreen
      leftAction={
        activeIndex > 0
          ? backHeaderAction(() => onPressStep(-1), {
              accessibilityLabel: t("onboarding_screen.previous"),
            })
          : undefined
      }
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("onboarding_screen.skip")}
          className="items-center justify-center"
          style={{ minWidth: 44, height: 44, paddingHorizontal: 8 }}
          onPress={handleSkip}
        >
          <Typography type="body-sm" style={{ color: accent }}>
            {t("onboarding_screen.skip")}
          </Typography>
        </Pressable>
      }
      scrollable={false}
      contentClassName="flex-1 gap-0 py-2"
      footer={footer}
    >
      <View
        testID="onboarding-pager-viewport"
        className="min-h-0 flex-1 overflow-hidden"
        onLayout={onPagerLayout}
      >
        {pagerSize ? (
          <Carousel
            ref={ref}
            data={slides}
            renderItem={({
              item,
              index,
            }: {
              item: OnboardingStepDefinition;
              index: number;
            }) => {
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
                    ? ({ inert: true } as unknown as React.ComponentProps<
                        typeof View
                      >)
                    : {})}
                  style={{ width: "100%", flex: 1 }}
                >
                  <ErrorBoundary
                    fallback={null}
                    onError={(err) => {
                      if (__DEV__) {
                        console.warn(
                          `onboarding step "${item.id}" failed to render:`,
                          err,
                        );
                      }
                    }}
                  >
                    <item.Component translate={t} reminders={reminders} />
                  </ErrorBoundary>
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
                AccessibilityInfo.announceForAccessibility(t(slides[index].id));
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
    </StandardScreen>
  );
}
