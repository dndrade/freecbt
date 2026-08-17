import { Routes } from "@/src";
import { Action } from "@/src/model";
import { useSafeWindowDimensions } from "@/src/hooks/use-safe-area";
import { Reminders, useReminders } from "@/src/features/reminders/use-reminders";
import { ImagePath, Screen, Section, SegmentedProgress } from "@/src/components";
import { Link, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import React from "react";
import { Image, Keyboard, Pressable, ScrollView, View } from "react-native";
import Carousel, { CarouselRenderItem, ICarouselInstance } from "react-native-reanimated-carousel";
import { ModelLoadedProps } from "@/src/hooks/use-model";

const slideNames = ["record", "challenge", "change", "reminders"] as const;
type SlideName = (typeof slideNames)[number];

export function OnboardingScreen(props: ModelLoadedProps) {
  const ref = React.useRef<ICarouselInstance>(null);
  const completionRequested = React.useRef(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const reminders = useReminders();
  const isSaving = props.model.onboardingCompletion === "saving";
  const hasFailed =
    typeof props.model.onboardingCompletion === "object" &&
    props.model.onboardingCompletion.status === "failure";

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

  const onPressStep = (count: number) => {
    ref.current?.scrollTo({
      count,
      animated: true,
    });
  };

  const slides = reminders.isSupported() ? slideNames : slideNames.slice(0, -1);
  const w = useSafeWindowDimensions();
  const width = Math.min(w.width - 32, 768);

  return (
    <Screen scroll={false} contentClassName="flex-1 py-6">
      <View className="flex-1">
        <Carousel
          ref={ref}
          data={[...slides]}
          renderItem={IntroItem({
            ...props,
            reminders,
            isSaving,
            hasFailed,
            onPressGetStarted,
          })}
          width={width}
          height={w.height - 150}
          loop={false}
          defaultIndex={0}
          onSnapToItem={(index) => {
            setActiveIndex(index);
            Keyboard.dismiss();
          }}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: Math.round(width * 0.15),
          }}
          // fix vertical scrolling for distortions
          onConfigurePanGesture={(gesture) => {
            "worklet";
            gesture.activeOffsetX([-10, 10]);
          }}
        />
        <Section className="mt-4 gap-4">
          <SegmentedProgress
            currentIndex={activeIndex}
            count={slides.length}
            accessibilityLabel="Onboarding progress"
          />
          <View className="flex-row items-center justify-between">
            {activeIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous"
                className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-secondary"
                style={{ width: 44, height: 44 }}
                onPress={() => onPressStep(-1)}
              >
                <Typography type="h4">‹</Typography>
              </Pressable>
            ) : (
              <View className="h-11 w-11" />
            )}
            {activeIndex < slides.length - 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next"
                className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-secondary"
                style={{ width: 44, height: 44 }}
                onPress={() => onPressStep(1)}
              >
                <Typography type="h4">›</Typography>
              </Pressable>
            ) : null}
          </View>
        </Section>
      </View>
    </Screen>
  );
}

function IntroItem(
  props: Pick<ModelLoadedProps, "dispatch" | "model" | "style" | "translate"> & {
    reminders: Reminders;
    isSaving: boolean;
    hasFailed: boolean;
    onPressGetStarted: () => void;
  }
): CarouselRenderItem<SlideName> {
  const { reminders, dispatch, translate: t, isSaving, hasFailed, onPressGetStarted } = props;

  async function onPressYes() {
    await reminders.enable(dispatch, t);
  }

  async function onPressNo() {
    await reminders.disable(dispatch);
  }

  function renderGetStarted() {
    return (
      <Section className="w-full gap-3">
        {hasFailed ? (
          <Typography type="body-sm" className="text-danger">
            Unable to save. Try again.
          </Typography>
        ) : null}
        <Button isDisabled={isSaving} onPress={onPressGetStarted}>
          {isSaving ? "Saving…" : "Get started"}
        </Button>
      </Section>
    );
  }

  function slideContent(children: React.ReactNode) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow justify-center px-2 pb-6"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <Section className="items-center gap-4">{children}</Section>
      </ScrollView>
    );
  }

  return function IntroItem({ item }) {
    switch (item) {
      case "record": {
        return slideContent(
          <>
            <Image
              source={ImagePath.looker}
              resizeMode="contain"
              accessibilityRole="image"
              className="h-40 w-40"
            />
            <Typography type="h1" accessibilityRole="header" className="text-center">
              {t("onboarding_screen.readme")}
            </Typography>
            <Link
              asChild
              href="https://freecbt.erosson.org/explanation/?ref=quirk"
              accessibilityLabel={t("onboarding_screen.header")}
            >
              <Button variant="secondary">{t("onboarding_screen.header")}</Button>
            </Link>
          </>
        );
      }
      case "challenge": {
        return slideContent(
          <>
            <Image
              source={ImagePath.eater}
              resizeMode="contain"
              accessibilityRole="image"
              className="h-40 w-40"
            />
            <Typography type="h1" accessibilityRole="header" className="text-center">
              {t("onboarding_screen.block1.header")}
            </Typography>
            <Typography type="body" color="muted" className="text-center">
              {t("onboarding_screen.block1.body")}
            </Typography>
          </>
        );
      }
      case "change": {
        return slideContent(
          <>
            <Image
              source={ImagePath.logo}
              resizeMode="contain"
              accessibilityRole="image"
              className="h-40 w-40"
            />
            <Typography type="h1" accessibilityRole="header" className="text-center">
              {t("onboarding_screen.block2.header")}
            </Typography>
            <Typography type="body" color="muted" className="text-center">
              {t("onboarding_screen.block2.body")}
            </Typography>
            {reminders.isSupported() ? null : renderGetStarted()}
          </>
        );
      }
      case "reminders": {
        return slideContent(
          <>
            <Image
              source={ImagePath.notifications}
              resizeMode="contain"
              accessibilityRole="image"
              className="h-48 w-64"
            />
            <Typography type="h1" accessibilityRole="header" className="text-center">
              {t("onboarding_screen.reminders.header")}
            </Typography>
            <Button onPress={onPressYes}>{t("onboarding_screen.reminders.button.yes")}</Button>
            <Button variant="secondary" onPress={onPressNo}>
              {t("onboarding_screen.reminders.button.no")}
            </Button>
            {renderGetStarted()}
          </>
        );
      }
      default:
        throw new Error(`unknown slide: ${item satisfies never}`);
    }
  };
}
