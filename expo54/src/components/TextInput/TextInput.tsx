// src/components/TextInput/TextInput.tsx
import React, { useState } from 'react';
import { Input, InputGroup, Label } from 'heroui-native';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TouchableOpacity,
    TextInputProps as RNTextInputProps,
} from 'react-native';
import { Icon } from '@/components/Icon';

export interface AppTextInputProps extends Omit<RNTextInputProps, 'style'> {
    value: string;
    onChangeText: (text: string) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    description?: string;
    isPassword?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    style?: ViewStyle;
    inputStyle?: TextStyle;
    testID?: string;
}

export const TextInput: React.FC<AppTextInputProps> = ({
                                                           value,
                                                           onChangeText,
                                                           label,
                                                           placeholder,
                                                           error,
                                                           description,
                                                           isPassword = false,
                                                           disabled = false,
                                                           autoFocus = false,
                                                           multiline = false,
                                                           numberOfLines,
                                                           style,
                                                           inputStyle,
                                                           testID,
                                                           ...restProps
                                                       }) => {
    const [isSecure, setIsSecure] = useState(isPassword);

    return (
        <View style={[styles.container, style]}>
            {/* 1. Accessible Form Label */}
            {label && <Label style={styles.label}>{label}</Label>}

            {/* 2. Input Container with Suffix Adornment */}
            {isPassword ? (
                <InputGroup>
                    <InputGroup.Input
                        testID={testID}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#64748B"
                        isInvalid={Boolean(error)}
                        isDisabled={disabled}
                        autoFocus={autoFocus}
                        secureTextEntry={isSecure}
                        multiline={multiline}
                        numberOfLines={numberOfLines}
                        accessibilityLabel={label ?? placeholder}
                        style={inputStyle}
                        {...restProps}
                    />
                    <InputGroup.Suffix>
                        <TouchableOpacity
                            onPress={() => setIsSecure((prev) => !prev)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
                            accessibilityHint="Toggles password visibility"
                            style={styles.actionButton}
                        >
                            <Icon name={isSecure ? 'unlock' : 'lock'} size="sm" color="#94A3B8" />
                        </TouchableOpacity>
                    </InputGroup.Suffix>
                </InputGroup>
            ) : (
                <Input
                    testID={testID}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#64748B"
                    isInvalid={Boolean(error)}
                    isDisabled={disabled}
                    autoFocus={autoFocus}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    accessibilityLabel={label ?? placeholder}
                    style={inputStyle}
                    {...restProps}
                />
            )}

            {/* 3. Accessible Error / Helper Messages */}
            {error ? (
                <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                </Text>
            ) : description ? (
                <Text style={styles.descriptionText}>{description}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 6,
    },
    label: {
        marginBottom: 6,
        fontSize: 14,
        fontWeight: '500',
        color: '#E2E8F0',
    },
    actionButton: {
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
    },
    descriptionText: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 4,
    },
});