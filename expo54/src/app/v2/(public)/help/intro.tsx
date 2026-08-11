import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Reminders, useReminders } from "@/src/features/reminders/use-reminders";
import { Action } from "@/src/model";
import { useSafeWindowDimensions } from "@/src/hooks/use-safe-area";
import { ImagePath } from "@/src/components";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Image, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
  CarouselRenderItem,
  ICarouselInstance,
  Pagination,
} from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return <LoadModel ready={Ready} />;
}
const slideNames = ["record", "challenge", "change", "reminders"] as const;
export type SlideName = (typeof slideNames)[number];
// export const SlideName = z.enum(slideNames);
// export type SlideName = z.infer<typeof SlideName>;
export function Ready(props: ModelLoadedProps) {
  const { style: s } = props;
  const ref = React.useRef<ICarouselInstance>(null);
  const completionRequested = React.useRef(false);
  const router = useRouter();
  const progress = useSharedValue<number>(0);
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
  const onPressPagination = (index: number) => {
    ref.current?.scrollTo({
      count: index - progress.value,
      animated: true,
    });
  };
  const slides = reminders.isSupported() ? slideNames : slideNames.slice(0, -1);
  const w = useSafeWindowDimensions();
  const width = Math.min(w.width, s.container.maxWidth);
  return (
    <SafeAreaView style={[s.view, s.p0, s.py4]}>
      <View style={[s.container]}>
        <Carousel
          ref={ref}
          data={[...slides]}
          onProgressChange={progress}
          renderItem={IntroItem({
            ...props,
            reminders,
            isSaving,
            hasFailed,
            onPressGetStarted,
          })}
          width={width}
          height={w.height - 150}
          onSnapToItem={(index) => {
            Keyboard.dismiss();
          }}
          loop={false}
          defaultIndex={0}
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
        <Pagination.Basic
          progress={progress}
          data={[...slides]}
          dotStyle={s.paginationDot}
          activeDotStyle={s.activePaginationDot}
          containerStyle={{ gap: 5, marginTop: 10 }}
          onPress={onPressPagination}
        />
      </View>
    </SafeAreaView>
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
  const { reminders, dispatch, style: s, translate: t, isSaving, hasFailed, onPressGetStarted } = props;

  async function onPressYes() {
    await reminders.enable(dispatch, t);
  }
  async function onPressNo() {
    await reminders.disable(dispatch);
  }
  function renderGetStarted() {
    return (
      <>
        {hasFailed ? (
          <Text style={[s.errorText]}>Unable to save. Try again.</Text>
        ) : null}
        <TouchableOpacity
          style={[s.button]}
          disabled={isSaving}
          onPress={onPressGetStarted}
        >
          <Text style={[s.buttonText]}>
            {isSaving ? "Saving…" : "Get started"}
          </Text>
        </TouchableOpacity>
      </>
    );
  }
  return function IntroItem({ item }) {
    switch (item) {
      case "record": {
        return (
          <>
            <Image
              source={ImagePath.looker}
              resizeMode="contain"
              style={[s.selfCenter, s.my4, { width: 156, height: 156 }]}
            />
            <Text style={[s.header]}>{t("onboarding_screen.readme")}</Text>
            <Link
              style={[s.flex1, s.border, s.rounded, s.p2, s.button]}
              href="https://freecbt.erosson.org/explanation/?ref=quirk"
            >
              <TouchableOpacity style={[s.flex1]}>
                <Text style={[s.buttonText]}>
                  {t("onboarding_screen.header")}
                </Text>
              </TouchableOpacity>
            </Link>
          </>
        );
      }
      case "challenge": {
        return (
          <>
            <Image
              source={ImagePath.eater}
              resizeMode="contain"
              style={[s.selfCenter, s.my4, { width: 156, height: 156 }]}
            />
            <Text style={[s.header]}>
              {t("onboarding_screen.block1.header")}
            </Text>
            <Text style={[s.subheader]}>
              {t("onboarding_screen.block1.body")}
            </Text>
          </>
        );
      }
      case "change": {
        return (
          <>
            <Image
              source={ImagePath.logo}
              resizeMode="contain"
              style={[s.selfCenter, s.my4, { width: 156, height: 156 }]}
            />
            <Text style={[s.header]}>
              {t("onboarding_screen.block2.header")}
            </Text>
            <Text style={[s.subheader]}>
              {t("onboarding_screen.block2.body")}
            </Text>
            {reminders.isSupported() ? null : renderGetStarted()}
          </>
        );
      }
      case "reminders": {
        return (
          <>
            <Image
              source={ImagePath.notifications}
              resizeMode="contain"
              style={[s.selfCenter, s.my4, { width: 256, height: 196 }]}
            />
            <Text style={[s.header]}>
              {t("onboarding_screen.reminders.header")}
            </Text>
            <TouchableOpacity style={[s.button]} onPress={onPressYes}>
              <Text style={[s.buttonText]}>
                {t("onboarding_screen.reminders.button.yes")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.button]} onPress={onPressNo}>
              <Text style={[s.buttonText]}>
                {t("onboarding_screen.reminders.button.no")}
              </Text>
            </TouchableOpacity>
            {renderGetStarted()}
          </>
        );
      }
      default:
        throw new Error(`unknown slide: ${item satisfies never}`);
    }
  };
}
