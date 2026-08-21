// src/components/layouts/Base/ScreenHeader.tsx
import React from 'react';
import { I18nManager, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Typography, useThemeColor } from 'heroui-native';
import { Icon, SemanticIconName } from '@/src/components/Icon';

export interface HeaderAction {
    icon: SemanticIconName;
    onPress: () => void;
    accessibilityLabel: string;
    accessibilityHint?: string;
    testID?: string;
}

export interface ScreenHeaderProps {
    title?: string;
    titleAccessibilityLabel?: string;
    leftAction?: HeaderAction;
    rightAction?: HeaderAction;
    /** Arbitrary slot content, used when the action isn't a single icon button (e.g. a text "Skip" control). Ignored if the matching *Action prop is set. */
    left?: React.ReactNode;
    right?: React.ReactNode;
    style?: ViewStyle;
}

/**
 * Builds a back HeaderAction with the RTL-correct chevron, so callers don't
 * have to special-case I18nManager.isRTL themselves for the most common
 * header action.
 */
export function backHeaderAction(
    onPress: () => void,
    opts?: { accessibilityLabel?: string; testID?: string },
): HeaderAction {
    return {
        icon: I18nManager.isRTL ? 'chevron-right' : 'chevron-left',
        onPress,
        accessibilityLabel: opts?.accessibilityLabel ?? 'Back',
        accessibilityHint: 'Navigates to previous screen',
        testID: opts?.testID,
    };
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
                                                              title,
                                                              titleAccessibilityLabel,
                                                              leftAction,
                                                              rightAction,
                                                              left,
                                                              right,
                                                              style,
                                                          }) => {
    const foreground = useThemeColor('foreground');

    return (
        <View
            style={[styles.container, style]}
            accessibilityRole="header"
            accessibilityLabel={title ? `${title} screen header` : 'Navigation header'}
        >
            {/* Left Slot (e.g. Back Navigation) */}
            <View style={styles.slot}>
                {leftAction ? (
                    <TouchableOpacity
                        testID={leftAction.testID}
                        onPress={leftAction.onPress}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={leftAction.accessibilityLabel}
                        accessibilityHint={leftAction.accessibilityHint ?? 'Navigates to previous screen'}
                        style={styles.touchable}
                    >
                        <Icon name={leftAction.icon} size="md" color={foreground} />
                    </TouchableOpacity>
                ) : (
                    left ?? null
                )}
            </View>

            {/* Center Title Slot: Semantic Landmark Heading */}
            <View style={styles.titleSlot}>
                {title ? (
                    <Typography.Heading
                        type="h4"
                        numberOfLines={1}
                        accessible={true}
                        accessibilityRole="header"
                        aria-level={1}
                        accessibilityLabel={titleAccessibilityLabel ?? title}
                    >
                        {title}
                    </Typography.Heading>
                ) : null}
            </View>

            {/* Right Slot (e.g. Settings, Search, Overflow Menu) */}
            <View style={styles.slot}>
                {rightAction ? (
                    <TouchableOpacity
                        testID={rightAction.testID}
                        onPress={rightAction.onPress}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={rightAction.accessibilityLabel}
                        accessibilityHint={rightAction.accessibilityHint}
                        style={styles.touchable}
                    >
                        <Icon name={rightAction.icon} size="md" color={foreground} />
                    </TouchableOpacity>
                ) : (
                    right ?? null
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    slot: {
        minWidth: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    touchable: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleSlot: {
        flex: 1,
        alignItems: 'center',
    },
});
