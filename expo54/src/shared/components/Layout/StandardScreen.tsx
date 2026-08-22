// src/components/layouts/StandardScreen.tsx
import React, { useContext } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ViewStyle,
    AccessibilityProps,
} from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { cn, useThemeColor } from 'heroui-native';
import { ScreenContainer, ScreenHeader, HeaderAction } from './Base';

export interface StandardScreenProps extends AccessibilityProps {
    title?: string;
    titleAccessibilityLabel?: string;
    leftAction?: HeaderAction;
    rightAction?: HeaderAction;
    left?: React.ReactNode;
    right?: React.ReactNode;
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
                                                                  title,
                                                                  titleAccessibilityLabel,
                                                                  leftAction,
                                                                  rightAction,
                                                                  left,
                                                                  right,
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
    const hasHeader = Boolean(title || leftAction || rightAction || left || right);
    const separator = useThemeColor('separator');

    return (
        <ScreenContainer
            testID={testID}
            className={className}
            style={style}
            edges={isInsideTabBar ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
            {...accessibilityProps}
        >
            <KeyboardAvoidingView
                style={styles.fill}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                {/* Top Header Region */}
                {hasHeader && (
                    <ScreenHeader
                        title={title}
                        titleAccessibilityLabel={titleAccessibilityLabel}
                        leftAction={leftAction}
                        rightAction={rightAction}
                        left={left}
                        right={right}
                    />
                )}

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
                    <View className={cn(contentClassName)} style={[styles.fill, styles.staticBody, contentStyle]}>
                        {children}
                    </View>
                )}

                {/* Pinned Bottom Landmark Slot */}
                {footer && (
                    <View
                        accessibilityRole="toolbar"
                        accessibilityLabel="Action bar"
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
