import { cn } from "heroui-native";
import type { PropsWithChildren } from "react";
import { View } from "react-native";

type SectionProps = PropsWithChildren<{
  className?: string;
}>;

export function Section({ children, className }: SectionProps) {
  return <View className={cn("gap-3", className)}>{children}</View>;
}
