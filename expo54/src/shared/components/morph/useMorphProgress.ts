import { useEffect } from "react";
import {
  ReduceMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from "react-native-reanimated";

/**
 * Shared timing for every morph transition in the app. One constant so
 * future transitions stay visually consistent instead of drifting per call
 * site (this duplicated verbatim between flow-action.tsx and
 * main-tab-bar.tsx before this module existed).
 */
export const MORPH_TIMING: WithTimingConfig = {
  duration: 200,
  reduceMotion: ReduceMotion.System,
};

/**
 * Drives a single UI-thread progress value between 0 and 1 as `active`
 * changes. Every morph style helper (useCrossfadeLayerStyle,
 * useMorphContainerStyle) derives from the SharedValue this returns.
 */
export function useMorphProgress(active: boolean): SharedValue<number> {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, MORPH_TIMING);
  }, [progress, active]);

  return progress;
}
