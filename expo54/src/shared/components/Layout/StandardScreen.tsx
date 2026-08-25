// src/components/layouts/StandardScreen.tsx
import React, { useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  AccessibilityProps,
} from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { HeaderHeightContext } from "@react-navigation/elements";
import { cn, useThemeColor } from "heroui-native";
import { ScreenContainer } from "./Base";

export interface StandardScreenProps extends AccessibilityProps {
  scrollable?: boolean;
  footer?: React.ReactNode;
  testID?: string;
  className?: string;
  contentClassName?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  children: React.ReactNode;
}

export const StandardScreen: React.FC<StandardScreenProps> = ({
  scrollable = true,
  footer,
  testID,
  className,
  contentClassName,
  style,
  contentStyle,
  children,
  ...accessibilityProps
}) => {
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const isInsideTabBar = tabBarHeight > 0;
  const hasHeader = (useContext(HeaderHeightContext) ?? 0) > 0;
  const separator = useThemeColor("separator");

  return (
    <ScreenContainer
      testID={testID}
      className={className}
      style={style}
      edges={[
        ...(isInsideTabBar || hasHeader ? [] : (["top"] as const)),
        "left",
        "right",
        ...(isInsideTabBar ? [] : (["bottom"] as const)),
      ]}
      {...accessibilityProps}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* Scrollable / Static Main Content Landmark */}
        {scrollable ? (
          <ScrollView
            className={cn(contentClassName)}
            contentContainerStyle={[
              styles.scrollContent,
              !footer && isInsideTabBar && { paddingBottom: tabBarHeight + 16 },
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="none"
          >
            {children}
          </ScrollView>
        ) : (
          <View
            className={cn(contentClassName)}
            style={[styles.fill, styles.staticBody, contentStyle]}
          >
            {children}
          </View>
        )}

        {/* Pinned Bottom Landmark Slot */}
        {footer && (
          <View
            accessibilityRole="toolbar"
            accessibilityLabel="Controls"
            style={[
              styles.footerContainer,
              { borderTopColor: separator },
              { paddingBottom: isInsideTabBar ? tabBarHeight + 12 : 12 },
            ]}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  staticBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
