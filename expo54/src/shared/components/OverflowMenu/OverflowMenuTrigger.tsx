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

/**
 * HeroUI's Menu.Item calls onPress and then synchronously tears down the
 * menu's portal in the same event. When onPress navigates, the portal
 * unmount races the native-stack screen transition on Android and can crash
 * with "SafeAreaProvider contains null child". Deferring onPress to the next
 * frame lets the portal teardown finish first.
 */
export function deferPress(onPress: () => void): () => void {
  return () => {
    requestAnimationFrame(onPress);
  };
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
              onPress={deferPress(item.onPress)}
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
