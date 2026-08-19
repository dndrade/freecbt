import { cn, ListGroup } from "heroui-native";
import type { PropsWithChildren } from "react";

type SettingsCardProps = PropsWithChildren<{ className?: string }>;

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <ListGroup variant="default" className={cn("overflow-hidden", className)}>
      {children}
    </ListGroup>
  );
}
