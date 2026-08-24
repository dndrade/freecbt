import React from "react";
import { Menu } from "heroui-native";
import { HeaderActionButton } from "../Layout/Base/HeaderActionButton";
import { Icon, SemanticIconName } from "../Icon";

/** heroui-native's default PortalHost lives inside a second, nested
 * SafeAreaProvider whose children toggle null on portal mount/unmount,
 * which crashes Android's dispatchGetDisplayList. Route the overflow menu
 * to its own host (mounted in the root layout) instead. */
export const OVERFLOW_MENU_PORTAL_HOST = "overflow-menu";

export interface OverflowMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: SemanticIconName;
}

export interface OverflowMenuTriggerProps {
  items: OverflowMenuItem[];
  floating?: boolean;
}

export function OverflowMenuTrigger({
  items,
  floating,
}: OverflowMenuTriggerProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = React.useState(false);
  const pendingPress = React.useRef<(() => void) | undefined>(undefined);

  React.useEffect(() => {
    if (isOpen || !pendingPress.current) return;

    const onPress = pendingPress.current;
    pendingPress.current = undefined;
    const frame = requestAnimationFrame(onPress);
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!items.length) return null;

  return (
    <Menu isOpen={isOpen} onOpenChange={setIsOpen}>
      <Menu.Trigger asChild>
        <HeaderActionButton
          action={{ icon: "more-vertical", accessibilityLabel: "More options" }}
          floating={floating}
        />
      </Menu.Trigger>
      <Menu.Portal hostName={OVERFLOW_MENU_PORTAL_HOST}>
        <Menu.Overlay />
        <Menu.Content presentation="popover">
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              onPress={() => {
                pendingPress.current = item.onPress;
              }}
              variant={item.destructive ? "danger" : "default"}
            >
              {item.icon ? (
                <Icon
                  name={item.icon}
                  size="sm"
                  testID={`overflow-menu-item-icon-${item.label}`}
                />
              ) : null}
              <Menu.ItemTitle>{item.label}</Menu.ItemTitle>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
