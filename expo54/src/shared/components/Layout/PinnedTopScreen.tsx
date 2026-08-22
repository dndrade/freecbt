// src/components/layouts/PinnedTopScreen.tsx
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
import { ScreenContainer } from './Base/ScreenContainer';
import { ScreenHeader, HeaderAction } from './Base/ScreenHeader';

export interface PinnedTopScreenProps extends AccessibilityProps {
    title?: string;
    pinnedTopContent: React.ReactNode;
    leftAction?: HeaderAction;
    rightAction?: HeaderAction;
    scrollable?: boolean;
    footer?: React.ReactNode;
    testID?: string;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    children: React.ReactNode;
}

export const PinnedTopScreen: React.FC<PinnedTopScreenProps> = ({
                                                                    title,
                                                                    pinnedTopContent,
                                                                    leftAction,
                                                                    rightAction,
                                                                    scrollable = true,
                                                                    footer,
                                                                    testID,
                                                                    style,
                                                                    contentStyle,
                                                                    children,
                                                                    ...accessibilityProps
                                                                }) => {
    const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
    const isInsideTabBar = tabBarHeight > 0;
    const hasHeader = Boolean(title || leftAction || rightAction);

    return (
        <ScreenContainer
            testID={testID}
            style={style}
            edges={isInsideTabBar ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
            {...accessibilityProps}
        >
            <KeyboardAvoidingView
                style={styles.fill}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                {/* 1. Header Landmark */}
                {hasHeader && (
                    <ScreenHeader
                        title={title}
                        leftAction={leftAction}
                        rightAction={rightAction}
                    />
                )}

                {/* 2. Pinned Top Surface (Search Bars, Category Chips, Segments) */}
                <View
                    accessibilityRole="toolbar"
                    accessibilityLabel="Filtering controls"
                    style={styles.pinnedContainer}
                >
                    {pinnedTopContent}
                </View>

                {/* 3. Main Body */}
                {scrollable ? (
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            !footer && isInsideTabBar && { paddingBottom: tabBarHeight + 16 },
                            contentStyle,
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={[styles.fill, styles.staticBody, contentStyle]}>
                        {children}
                    </View>
                )}

                {/* 4. Pinned Bottom Footer */}
                {footer && (
                    <View
                        accessibilityRole="toolbar"
                        accessibilityLabel="Action bar"
                        style={[
                            styles.footerContainer,
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
    pinnedContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        zIndex: 2,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    staticBody: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    footerContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
});