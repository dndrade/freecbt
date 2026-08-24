// src/components/OtpInput/OtpInput.tsx
import React from 'react';
import { InputOTP } from 'heroui-native';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';

export interface AppOtpInputProps {
    value: string;
    onValueChange: (code: string) => void;
    length?: number;
    error?: string;
    disabled?: boolean;
    style?: ViewStyle;
    testID?: string;
}

export const OtpInput: React.FC<AppOtpInputProps> = ({
                                                         value,
                                                         onValueChange,
                                                         length = 6,
                                                         error,
                                                         disabled = false,
                                                         style,
                                                         testID,
                                                     }) => {
    return (
        <View
            testID={testID}
            style={[styles.container, style]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Security verification code, ${length} digits`}
            accessibilityHint={error ?? 'Enter the verification code'}
            accessibilityState={{
                disabled,
                busy: false,
            }}
        >
            <InputOTP
                value={value}
                onChange={onValueChange}
                maxLength={length}
                isInvalid={Boolean(error)}
                isDisabled={disabled}
            >
                <InputOTP.Group>
                    {Array.from({ length }).map((_, index) => (
                        <InputOTP.Slot key={index} index={index} />
                    ))}
                </InputOTP.Group>
            </InputOTP>

            {error ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 8,
    },
});