import React from 'react';
import { Card as HeroUICard } from 'heroui-native';
import {ViewStyle, TouchableOpacity, StyleProp} from 'react-native';

export interface AppCardProps {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const Card: React.FC<AppCardProps> = ({
                                                 children,
                                                 onPress,
                                                 accessibilityLabel,
                                                 accessibilityHint,
                                                 style,
                                                 testID,
                                             }) => {
    const cardContent = (
        <HeroUICard testID={!onPress ? testID : undefined} style={style}>
            <HeroUICard.Body>{children}</HeroUICard.Body>
        </HeroUICard>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                testID={testID}
                onPress={onPress}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
            >
                {cardContent}
            </TouchableOpacity>
        );
    }

    return cardContent;
};