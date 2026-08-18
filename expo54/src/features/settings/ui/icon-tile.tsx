import { cn, useThemeColor } from "heroui-native";
import { View } from "react-native";

export type IconTileTone = "accent" | "success" | "warning" | "danger";

const backgroundRole = {
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const satisfies Record<IconTileTone, "accent" | "success" | "warning" | "danger">;

const foregroundRole = {
  accent: "accent-foreground",
  success: "success-foreground",
  warning: "warning-foreground",
  danger: "danger-foreground",
} as const satisfies Record<
  IconTileTone,
  "accent-foreground" | "success-foreground" | "warning-foreground" | "danger-foreground"
>;

export function IconTile(props: {
  tone?: IconTileTone;
  children: (iconColor: string) => React.ReactNode;
  className?: string;
}) {
  const { tone = "accent", children, className } = props;
  const backgroundColor = useThemeColor(backgroundRole[tone]);
  const iconColor = useThemeColor(foregroundRole[tone]);

  return (
    <View
      className={cn(
        "h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
        className
      )}
      style={{ backgroundColor }}
    >
      {children(iconColor)}
    </View>
  );
}
