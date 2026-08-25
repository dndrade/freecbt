import React from "react";
import { Pressable, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Typography, useThemeColor } from "heroui-native";

export interface AppSelectableCardProps {
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  variant?: "default" | "check";
  tag?: string;
  disabled?: boolean;
  testID?: string;
}

const PRESS_TIMING = { duration: 130, reduceMotion: ReduceMotion.System };
const SELECT_TIMING = { duration: 180, reduceMotion: ReduceMotion.System };
const CHECK_TIMING = { duration: 150, reduceMotion: ReduceMotion.System };

export function SelectableCard({
  title,
  detail,
  selected,
  onPress,
  variant = "default",
  tag,
  disabled = false,
  testID,
}: AppSelectableCardProps) {
  const accent = useThemeColor("accent");
  const success = useThemeColor("success");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface-tertiary");
  const [pressed, setPressed] = React.useState(false);

  const pressStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: withTiming(pressed ? 0.97 : 1, PRESS_TIMING) }],
    }),
    [pressed],
  );
  const selectStyle = useAnimatedStyle(
    () => ({
      borderColor: withTiming(selected ? accent : border, SELECT_TIMING),
      backgroundColor: withTiming(
        selected ? `${accent}22` : surface,
        SELECT_TIMING,
      ),
    }),
    [accent, border, selected, surface],
  );
  const checkStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(selected ? 1 : 0, CHECK_TIMING),
      transform: [{ scale: withTiming(selected ? 1 : 0.7, CHECK_TIMING) }],
    }),
    [selected],
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ minHeight: 56 }}
    >
      <Animated.View
        style={[
          {
            flexDirection: variant === "check" ? "row" : "column",
            alignItems: "flex-start",
            gap: 4,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            opacity: disabled ? 0.5 : 1,
          },
          pressStyle,
          selectStyle,
        ]}
      >
        {variant === "check" && (
          <Animated.View
            testID={testID ? `${testID}-check` : undefined}
            accessibilityElementsHidden={!selected}
            style={[
              {
                width: 24,
                height: 24,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: border,
                backgroundColor: selected ? success : "transparent",
                marginRight: 4,
              },
              checkStyle,
            ]}
          />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          {tag && (
            <Typography
              type="body-xs"
              style={{ color: accent, fontWeight: "700" }}
            >
              {tag}
            </Typography>
          )}
          <Typography type="body" weight="semibold">
            {title}
          </Typography>
          {detail && (
            <Typography type="body-sm" className="text-default-500">
              {detail}
            </Typography>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
