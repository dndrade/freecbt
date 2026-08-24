import React, { forwardRef } from "react";
import {
  I18nManager,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from "react-native";
import { useThemeColor } from "heroui-native";
import { Icon, SemanticIconName } from "@/shared/components/Icon";

export interface HeaderAction {
  icon: SemanticIconName;
  /** Supplied by the action, or omitted when a wrapping trigger (e.g. Menu.Trigger asChild) provides its own press behavior. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Builds a back HeaderAction with the RTL-correct chevron, so callers don't
 * have to special-case I18nManager.isRTL themselves for the most common
 * header action.
 */
export function backHeaderAction(
  onPress: () => void,
  opts?: { accessibilityLabel?: string; testID?: string },
) {
  return {
    icon: I18nManager.isRTL ? "chevron-right" : "chevron-left",
    onPress,
    accessibilityLabel: opts?.accessibilityLabel ?? "Back",
    accessibilityHint: "Navigates to previous screen",
    testID: opts?.testID,
  } satisfies HeaderAction;
}

export interface HeaderActionButtonProps extends Omit<
  PressableProps,
  "onPress"
> {
  action: HeaderAction;
  /** Circular, semi-opaque treatment for use over hero/cover imagery. Purely decorative — positioning/safe-area offsets stay the caller's responsibility. */
  floating?: boolean;
  /** Injected by a wrapping Menu.Trigger (asChild) — takes priority over action.onPress when present. */
  onPress?: () => void;
}

export const HeaderActionButton = forwardRef<View, HeaderActionButtonProps>(
  ({ action, floating, onPress, style, ...rest }, ref) => {
    const foreground = useThemeColor("foreground");

    return (
      <Pressable
        ref={ref}
        onPress={onPress ?? action.onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel}
        accessibilityHint={action.accessibilityHint}
        testID={action.testID}
        style={(state) => [
          styles.base,
          floating && styles.floating,
          state.pressed && styles.pressed,
          typeof style === "function" ? style(state) : style,
        ]}
        {...rest}
      >
        <Icon name={action.icon} size="md" color={foreground} />
      </Pressable>
    );
  },
);

HeaderActionButton.displayName = "HeaderActionButton";

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  floating: {
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  pressed: {
    opacity: 0.7,
  },
});
