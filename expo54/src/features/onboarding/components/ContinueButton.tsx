import React from "react";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/shared/components";

export interface ContinueButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

const TIMING = { duration: 200, reduceMotion: ReduceMotion.System };

export const ContinueButton: React.FC<ContinueButtonProps> = ({
  title,
  onPress,
  disabled = false,
  testID,
}) => {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(disabled ? 0.35 : 1, TIMING),
  }));

  return (
    <Animated.View style={style}>
      <Button
        title={title}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
      />
    </Animated.View>
  );
};
