import { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

export type MorphContainerOptions = {
  from: Record<string, number>;
  to: Record<string, number>;
};

/**
 * Interpolates every numeric key present in both `from` and `to` across
 * `progress` (e.g. width/borderRadius for a pill that resizes). Generic —
 * not tied to any specific component; pass the result as a `style` prop.
 */
export function useMorphContainerStyle(
  progress: SharedValue<number>,
  opts: MorphContainerOptions
) {
  const keys = Object.keys(opts.from).filter((key) => key in opts.to);

  return useAnimatedStyle(() => {
    const style: Record<string, number> = {};
    for (const key of keys) {
      style[key] = interpolate(
        progress.value,
        [0, 1],
        [opts.from[key]!, opts.to[key]!]
      );
    }
    return style;
  });
}
