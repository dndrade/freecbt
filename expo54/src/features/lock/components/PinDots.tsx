import React, { useEffect } from "react";
import { View } from "react-native";
import { useThemeColor } from "@/shared/components";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function PinDots(props: {
  length: number;
  filled: number;
  shake?: boolean;
}) {
  const { length, filled, shake = false } = props;
  const accent = useThemeColor("accent");
  const border = useThemeColor("separator");
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!shake) return;
    offset.value = withSequence(
      withTiming(-8, { duration: 40, reduceMotion: ReduceMotion.System }),
      withTiming(8, { duration: 40, reduceMotion: ReduceMotion.System }),
      withTiming(-8, { duration: 40, reduceMotion: ReduceMotion.System }),
      withTiming(8, { duration: 40, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 40, reduceMotion: ReduceMotion.System }),
    );
  }, [offset, shake]);

  const animatedStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: offset.value }] }),
    [],
  );

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${filled} of ${length} digits entered`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: length, now: filled }}
      className="flex-row gap-3"
      style={animatedStyle}
    >
      {Array.from({ length }, (_, index) => (
        <View
          key={index}
          testID={`pin-dot-${index}`}
          accessibilityState={{ selected: index < filled }}
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 1.5,
            borderColor: border,
            backgroundColor: index < filled ? accent : "transparent",
          }}
        />
      ))}
    </Animated.View>
  );
}
