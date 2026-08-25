// src/components/layouts/CollapsibleHeroScreen.tsx
import React, { useRef, useContext } from "react";
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  AccessibilityProps,
} from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "heroui-native";
import { ScreenContainer } from "./Base/ScreenContainer";
import { HeaderAction, HeaderActionButton } from "./Base/HeaderActionButton";
import { OverflowMenuItem, OverflowMenuTrigger } from "../OverflowMenu";

export interface CollapsibleHeroScreenProps extends AccessibilityProps {
  title?: string;
  heroContent: React.ReactNode;
  heroHeight?: number;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  overflowItems?: OverflowMenuItem[];
  footer?: React.ReactNode;
  testID?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  children: React.ReactNode;
}

export const CollapsibleHeroScreen: React.FC<CollapsibleHeroScreenProps> = ({
  title,
  heroContent,
  heroHeight = 240,
  leftAction,
  rightAction,
  overflowItems,
  footer,
  testID,
  style,
  contentStyle,
  children,
  ...accessibilityProps
}) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const isInsideTabBar = tabBarHeight > 0;

  // Title fades in only once hero collapses near the top bar
  const titleOpacity = scrollY.interpolate({
    inputRange: [heroHeight - 80, heroHeight - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Hero parallax: stretches on over-scroll down, translates up on scroll
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-heroHeight, 0, heroHeight],
    outputRange: [-heroHeight / 2, 0, -heroHeight * 0.75],
    extrapolate: "clamp",
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-heroHeight, 0],
    outputRange: [2, 1],
    extrapolate: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroHeight - 40],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const rightSlot = rightAction ? (
    <HeaderActionButton action={rightAction} floating />
  ) : overflowItems?.length ? (
    <OverflowMenuTrigger items={overflowItems} floating />
  ) : null;

  return (
    <ScreenContainer
      testID={testID}
      style={style}
      edges={isInsideTabBar ? ["left", "right"] : ["bottom", "left", "right"]}
      {...accessibilityProps}
    >
      {/* 1. Collapsing Parallax Hero Layer */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            height: heroHeight + insets.top,
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
          },
        ]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel="Hero background cover"
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>{heroContent}</View>
      </Animated.View>

      <View style={[styles.fixedHeaderWrapper, { paddingTop: insets.top }]}>
        <View
          style={styles.headerRow}
          accessibilityRole="header"
          accessibilityLabel={
            title ? `${title} screen header` : "Navigation header"
          }
        >
          <View style={styles.slot}>
            {leftAction ? (
              <HeaderActionButton
                action={{
                  ...leftAction,
                  accessibilityHint:
                    leftAction.accessibilityHint ??
                    "Navigates to previous screen",
                }}
                floating
              />
            ) : null}
          </View>
          <View style={styles.titleSlot} />
          <View style={styles.slot}>{rightSlot}</View>
        </View>
        <Animated.View
          style={[
            styles.animatedTitleSlot,
            { top: insets.top, opacity: titleOpacity },
          ]}
          pointerEvents="none"
        >
          {title ? (
            <Typography.Heading
              type="h4"
              numberOfLines={1}
              accessible={true}
              accessibilityRole="header"
              aria-level={1}
            >
              {title}
            </Typography.Heading>
          ) : null}
        </Animated.View>
      </View>

      {/* 3. Main Scroll View */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: heroHeight + insets.top + 8,
            paddingBottom: isInsideTabBar ? tabBarHeight + 16 : 24,
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {children}
      </Animated.ScrollView>

      {/* 4. Pinned Bottom Controls */}
      {footer && (
        <View
          accessibilityRole="toolbar"
          accessibilityLabel="Controls"
          style={[
            styles.footerContainer,
            { paddingBottom: isInsideTabBar ? tabBarHeight + 12 : 12 },
          ]}
        >
          {footer}
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: "hidden",
  },
  fixedHeaderWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  slot: {
    minWidth: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  titleSlot: { flex: 1 },
  animatedTitleSlot: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16 },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    zIndex: 10,
  },
});
