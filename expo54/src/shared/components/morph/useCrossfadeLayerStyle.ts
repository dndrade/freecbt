import { I18nManager } from "react-native";
import { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

export type CrossfadeLayerOptions = {
  /** The progress value (0 or 1) at which this layer is fully visible. */
  appearsAt: 0 | 1;
};

/**
 * Opacity + RTL-aware slide for one layer of a two-layer crossfade, e.g. an
 * icon fading out as a text label fades in. Extracted from flow-action.tsx's
 * arrowStyle/finalStyle, generalized to either direction via `appearsAt`.
 */
export function useCrossfadeLayerStyle(
  progress: SharedValue<number>,
  opts: CrossfadeLayerOptions
) {
  const direction = I18nManager.isRTL ? -1 : 1;
  const sign = opts.appearsAt === 1 ? -1 : 1;

  return useAnimatedStyle(() => {
    const distanceFromVisible =
      opts.appearsAt === 1 ? 1 - progress.value : progress.value;
    return {
      opacity: 1 - distanceFromVisible,
      transform: [{ translateX: 8 * direction * sign * distanceFromVisible }],
    };
  });
}
