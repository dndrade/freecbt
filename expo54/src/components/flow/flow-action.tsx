import { Feather } from "@expo/vector-icons";
import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { I18nManager } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type FlowActionProps = {
  state: "next" | "final";
  onPress: () => void;
  isDisabled?: boolean;
  accessibilityLabel: string;
  finalLabel: string;
};

const timingConfig = { duration: 200, reduceMotion: ReduceMotion.System };

export function FlowAction({
  state,
  onPress,
  isDisabled = false,
  accessibilityLabel,
  finalLabel,
}: FlowActionProps) {
  const [accent, accentForeground] = useThemeColor([
    "accent",
    "accent-foreground",
  ]);
  const progress = useSharedValue(state === "final" ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(state === "final" ? 1 : 0, timingConfig);
  }, [progress, state]);

  const controlStyle = useAnimatedStyle(() => ({
    width: 48 + 112 * progress.value,
    borderRadius: 24 - 12 * progress.value,
    backgroundColor: accent,
  }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const finalStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <PressableFeedback
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      isDisabled={isDisabled}
      onPress={onPress}
      className="h-12 items-center justify-center overflow-hidden bg-accent"
      style={controlStyle}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute inset-0 items-center justify-center"
        style={arrowStyle}
      >
        <Feather
          name={I18nManager.isRTL ? "arrow-left" : "arrow-right"}
          size={20}
          color={accentForeground}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={state !== "final"}
        importantForAccessibility={
          state === "final" ? "auto" : "no-hide-descendants"
        }
        className="absolute inset-0 items-center justify-center"
        style={finalStyle}
      >
        <Typography
          type="body"
          weight="semibold"
          style={{ color: accentForeground }}
        >
          {finalLabel}
        </Typography>
      </Animated.View>
    </PressableFeedback>
  );
}
