import { cn } from "heroui-native";
import type { PropsWithChildren } from "react";
import { View } from "react-native";

type SettingsCardProps = PropsWithChildren<{ className?: string }>;

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <View
      className={cn(
        "bg-surface rounded-2xl overflow-hidden divide-y divide-separator",
        className
      )}
    >
      {children}
    </View>
  );
}
