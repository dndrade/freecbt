import { cn, useThemeColor } from "heroui-native";
import type { PropsWithChildren } from "react";
import { View } from "react-native";

type SettingsCardProps = PropsWithChildren<{ className?: string }>;

export function SettingsCard({ children, className }: SettingsCardProps) {
  const surface = useThemeColor("surface");
  return (
    <View
      className={cn(
        "rounded-2xl overflow-hidden divide-y divide-separator",
        className
      )}
      style={{ backgroundColor: surface }}
    >
      {children}
    </View>
  );
}
