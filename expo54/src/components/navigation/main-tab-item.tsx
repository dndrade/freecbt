// src/components/navigation/main-tab-item.tsx

import type { Feather } from "@expo/vector-icons";
import { Feather as FeatherIcon } from "@expo/vector-icons";
import { cn, useThemeColor } from "heroui-native";
import { Pressable, Text } from "react-native";

// Matches the icon size already used for other interactive controls in this
// app (ScreenHeader back chevron, FlowAction icon) rather than inventing a
// new value — see expo54/src/components/layout/screen-header.tsx and
// expo54/src/components/flow/flow-action.tsx.
const ICON_SIZE = 20;

// 44x44 (iOS HIG) / 48x48dp (Material) is the platform-defined minimum
// touch target; not an arbitrary pixel choice.
const MIN_TOUCH_TARGET = 48;

export function MainTabItem({
  icon,
  label,
  selected,
  onPress,
  onLongPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const [accent, muted] = useThemeColor(["accent", "muted"]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      className="items-center justify-center gap-1 px-5 py-2"
      style={{ minHeight: MIN_TOUCH_TARGET }}
    >
      <FeatherIcon
        name={icon}
        size={ICON_SIZE}
        color={selected ? accent : muted}
      />
      <Text
        className={cn(
          "text-xs",
          selected ? "text-accent font-semibold" : "text-muted",
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
