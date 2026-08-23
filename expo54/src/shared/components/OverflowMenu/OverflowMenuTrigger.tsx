import React from "react";
import { Menu } from "heroui-native";
import { HeaderActionButton } from "../Layout/Base/HeaderActionButton";

export interface OverflowMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface OverflowMenuTriggerProps {
  items: OverflowMenuItem[];
  floating?: boolean;
}

export function OverflowMenuTrigger({
  items,
  floating,
}: OverflowMenuTriggerProps): React.ReactElement | null {
  if (!items.length) return null;

  return (
    <Menu>
      <Menu.Trigger asChild>
        <HeaderActionButton
          action={{ icon: "more-vertical", accessibilityLabel: "More options" }}
          floating={floating}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content presentation="popover">
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              onPress={item.onPress}
              variant={item.destructive ? "danger" : "default"}
            >
              <Menu.ItemTitle>{item.label}</Menu.ItemTitle>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
