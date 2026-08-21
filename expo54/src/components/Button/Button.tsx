// src/components/Button/Button.tsx
import React from 'react';
import { Button as HeroUIButton } from 'heroui-native';
import { ViewProps, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import type { AnimatedProps } from 'react-native-reanimated';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Accepts a plain style or a Reanimated animated style (e.g. from
 * useMorphContainerStyle) — HeroUI's underlying Button.Root already supports
 * this at runtime via PressableFeedbackProps extending AnimatedProps. */
type AnimatedViewStyle = AnimatedProps<ViewProps>['style'];

export interface AppButtonProps {
    /** Visible label. Ignored when `children` is provided — still used as
     * the accessibility-label fallback in that case if `accessibilityLabel`
     * is omitted, so most `children` callers should pass `accessibilityLabel`
     * explicitly instead of relying on `title`. */
    title?: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    style?: ViewStyle | AnimatedViewStyle;
    textStyle?: TextStyle;
    testID?: string;
    /** Additional CSS classes, forwarded to HeroUI's root. Needed to
     * neutralize the variant's default padding/radius when `children`
     * fully replaces the default title/spinner content. */
    className?: string;
    /** Custom content, replacing the default title label / loading
     * spinner. When set, `Button` becomes a plain animatable pressable
     * shell — the caller owns everything inside. */
    children?: React.ReactNode;
}

const VARIANT_MAP: Record<ButtonVariant, 'primary' | 'secondary' | 'danger' | 'ghost'> = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
    ghost: 'ghost',
};

export const Button: React.FC<AppButtonProps> = ({
                                                     title,
                                                     onPress,
                                                     variant = 'primary',
                                                     disabled = false,
                                                     loading = false,
                                                     accessibilityLabel,
                                                     accessibilityHint,
                                                     style,
                                                     textStyle,
                                                     testID,
                                                     className,
                                                     children,
                                                 }) => {
    const isInactive = disabled || loading;

    return (
        <HeroUIButton
            testID={testID}
            onPress={onPress}
            isDisabled={isInactive}
            variant={VARIANT_MAP[variant]}
            className={className}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{
                disabled: isInactive,
                busy: loading,
            }}
            style={style}
        >
            {children ?? (loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
                <HeroUIButton.Label style={textStyle}>{title}</HeroUIButton.Label>
            ))}
        </HeroUIButton>
    );
};
