// src/components/layouts/Base/ScreenContainer.tsx
import React from 'react';
import {
    View,
    StyleSheet,
    useWindowDimensions,
    ViewStyle,
    AccessibilityProps,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { cn, useThemeColor } from 'heroui-native';
import { EXPANDED_WIDTH_BREAKPOINT } from '@/constants';

export interface ScreenContainerProps extends AccessibilityProps {
    children: React.ReactNode;
    edges?: Edge[];
    /** Overrides the theme-derived background. Prefer letting theme decide. */
    backgroundColor?: string;
    className?: string;
    style?: ViewStyle;
    testID?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
                                                                    children,
                                                                    edges = ['top', 'bottom', 'left', 'right'],
                                                                    backgroundColor,
                                                                    className,
                                                                    style,
                                                                    testID,
                                                                    ...accessibilityProps
                                                                }) => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const themeBackground = useThemeColor('background');
    const isTablet = width > EXPANDED_WIDTH_BREAKPOINT;

    return (
        <View
            testID={testID}
            {...accessibilityProps}
            className={cn('flex-1', className)}
            style={[
                {
                    backgroundColor: backgroundColor ?? themeBackground,
                    paddingTop: edges.includes('top') ? insets.top : 0,
                    paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, 16) : 0,
                    paddingLeft: edges.includes('left') ? Math.max(insets.left, 16) : 0,
                    paddingRight: edges.includes('right') ? Math.max(insets.right, 16) : 0,
                },
                style,
            ]}
        >
            <View
                style={[
                    styles.contentConstraint,
                    isTablet && { maxWidth: EXPANDED_WIDTH_BREAKPOINT, alignSelf: 'center' },
                ]}
            >
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    contentConstraint: { flex: 1, width: '100%' },
});
