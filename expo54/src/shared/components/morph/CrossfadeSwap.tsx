import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import Animated, { type SharedValue } from "react-native-reanimated";
import { useMorphProgress } from "./useMorphProgress";
import { useCrossfadeLayerStyle } from "./useCrossfadeLayerStyle";

export type CrossfadeSwapProps = {
  /** false renders layer `a`; true renders layer `b`. */
  active: boolean;
  a: ReactNode;
  b: ReactNode;
  style?: ViewStyle;
  progress?: SharedValue<number>;
};

/**
 * Two content layers absolutely stacked, cross-fading between them as
 * `active` toggles. Layers are inert children (Icon, Typography, anything) —
 * this component owns all the animation, matching flow-action.tsx's
 * existing arrow/label pattern.
 */
export function CrossfadeSwap({
  active,
  a,
  b,
  style,
  progress: sharedProgress,
}: CrossfadeSwapProps) {
  const localProgress = useMorphProgress(active);
  const progress = sharedProgress ?? localProgress;
  const aStyle = useCrossfadeLayerStyle(progress, { appearsAt: 0 });
  const bStyle = useCrossfadeLayerStyle(progress, { appearsAt: 1 });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={active}
        importantForAccessibility={active ? "no-hide-descendants" : "auto"}
        className="absolute inset-0 items-center justify-center"
        style={[style, aStyle]}
      >
        {a}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? "auto" : "no-hide-descendants"}
        className="absolute inset-0 items-center justify-center"
        style={[style, bStyle]}
      >
        {b}
      </Animated.View>
    </>
  );
}
