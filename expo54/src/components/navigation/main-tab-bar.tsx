// src/components/navigation/main-tab-bar.tsx

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslate } from "@/src/i18n/use-i18n";
import { TAB_CONFIG } from "@/src/constants/tabs-config";
import { MainTabItem } from "./main-tab-item";

/**
 * Presentation-only replacement for the default Expo Router / React
 * Navigation tab bar chrome. Navigation state and route registration remain
 * owned by `Tabs` (via TAB_CONFIG in the parent layout); this component only
 * renders the floating bar and forwards presses to `navigation`.
 */
export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTranslate();
  const insets = useSafeAreaInsets();

  return (
    <View
      // Positioning-only wrapper: bounds where the pill can center itself,
      // renders nothing on its own. Wide margins (left-8/right-8) keep the
      // pill compact instead of edge-to-edge.
      className="absolute left-8 right-8 items-center"
      style={{ bottom: insets.bottom + 12 }}
    >
      <View className="flex-row items-stretch gap-2 rounded-3xl border border-border bg-overlay px-2 shadow-lg">
        {state.routes.map((route, index) => {
          const tab = TAB_CONFIG.find((c) => c.name === route.name);
          if (!tab) return null;

          const selected = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!selected && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <MainTabItem
              key={route.key}
              icon={tab.icon as React.ComponentProps<typeof Feather>["name"]}
              label={t(tab.labelKey)}
              selected={selected}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}
