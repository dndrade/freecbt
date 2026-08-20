import { Feather } from "@expo/vector-icons";
import { Typography, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { I18nManager, Pressable, View } from "react-native";

/**
 * 44x44 (iOS HIG) touch target; also the row's own render height, since the
 * back/right slots are sized to it. `SettingsMenuButton` imports this same
 * constant to align its floating trigger with a TopBar's row on screens
 * that don't render one - see settings-menu-button.tsx.
 */
export const TOP_BAR_ROW_HEIGHT = 44;

export interface TopBarProps {
  title?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  right?: ReactNode;
  testID?: string;
}

export function TopBar({
  title,
  onBack,
  backAccessibilityLabel = "Back",
  right,
  testID,
}: TopBarProps) {
  const accent = useThemeColor("accent");

  return (
    <View
      testID={testID}
      className="w-full flex-row items-center justify-center px-2 py-2 relative"
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
          onPress={onBack}
          className="absolute left-1 items-center justify-center"
          style={{ width: TOP_BAR_ROW_HEIGHT, height: TOP_BAR_ROW_HEIGHT }}
        >
          <Feather
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
            size={20}
            color={accent}
          />
        </Pressable>
      ) : null}
      {title ? <Typography.Heading type="h4">{title}</Typography.Heading> : null}
      {right ? (
        <View className="absolute right-1 items-center justify-center">
          {right}
        </View>
      ) : null}
    </View>
  );
}
