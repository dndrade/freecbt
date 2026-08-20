// src/components/navigation/main-tab-bar.tsx

import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { Feather } from "@expo/vector-icons";
import { Feather as FeatherIcon } from "@expo/vector-icons";
import { Tabs as HeroTabs, cn, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslate } from "@/src/i18n/use-i18n";
import { TAB_CONFIG } from "@/src/constants/tabs-config";

// Matches the icon size already used for other interactive controls in this
// app (ScreenHeader back chevron, FlowAction icon) rather than inventing a
// new value — see expo54/src/components/layout/screen-header.tsx and
// expo54/src/components/flow/flow-action.tsx.
const ICON_SIZE = 20;

// 44x44 (iOS HIG) / 48x48dp (Material) is the platform-defined minimum
// touch target; not an arbitrary pixel choice.
const MIN_TOUCH_TARGET = 48;

// ponytail: icon-only by default; set to true to show labels, false to hide
const SHOW_TAB_LABELS = false;

/**
 * Presentation-only replacement for the default Expo Router / React
 * Navigation tab bar chrome. Navigation state and route registration remain
 * owned by `Tabs` (via TAB_CONFIG in the parent layout); this component only
 * renders the floating bar and forwards presses to `navigation`.
 */
export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTranslate();
  const insets = useSafeAreaInsets();
  const [accent, muted] = useThemeColor(["accent", "muted"]);

  const activeRouteName = state.routes[state.index].name;

  const handleValueChange = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (routeName !== activeRouteName && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View
      // Positioning-only wrapper: bounds where the pill can center itself,
      // renders nothing on its own. Wide margins (left-8/right-8) keep the
      // pill compact instead of edge-to-edge.
      className="absolute left-8 right-8 items-center"
      style={{ bottom: insets.bottom + 12 }}
    >
      <HeroTabs value={activeRouteName} onValueChange={handleValueChange}>
        <HeroTabs.List
          style={{ backgroundColor: "transparent", padding: 0 }}
          className="flex-row items-stretch gap-2 rounded-3xl border border-border bg-overlay px-2 shadow-lg"
        >
          <HeroTabs.Indicator />
          {state.routes.map((route) => {
            const tab = TAB_CONFIG.find((c) => c.name === route.name);
            if (!tab) return null;
            const label = t(tab.labelKey);
            return (
              <HeroTabs.Trigger
                key={route.key}
                value={route.name}
                accessibilityLabel={label}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                style={{ minHeight: MIN_TOUCH_TARGET }}
                className="items-center justify-center gap-1 px-5 py-2"
              >
                {({ isSelected }) => (
                  <>
                    <FeatherIcon
                      name={tab.icon as React.ComponentProps<typeof Feather>["name"]}
                      size={ICON_SIZE}
                      color={isSelected ? accent : muted}
                    />
                    {SHOW_TAB_LABELS && (
                      <HeroTabs.Label
                        className={cn("text-xs", isSelected && "font-semibold")}
                        style={{ color: isSelected ? accent : muted }}
                        numberOfLines={1}
                      >
                        {label}
                      </HeroTabs.Label>
                    )}
                  </>
                )}
              </HeroTabs.Trigger>
            );
          })}
        </HeroTabs.List>
      </HeroTabs>
    </View>
  );
}
