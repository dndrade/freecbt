// src/features/settings/components/SettingRow.tsx
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Icon, Card } from '@/shared/components';
import type { SemanticIconName } from '@/shared/components/Icon/Icon.types';

type SettingRowProps =
    | {
    type: 'nav';
    icon: SemanticIconName;
    label: string;
    description?: string;
    onPress: () => void;
}
    | {
    type: 'value';
    icon: SemanticIconName;
    label: string;
    value: string;
    onPress: () => void;
}
    | {
    type: 'toggle';
    icon: SemanticIconName;
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
};

export const SettingRow: React.FC<SettingRowProps> = (props) => {
    if (props.type === 'toggle') {
        return (
            <Card style={styles.card}>
                <View style={styles.row}>
                    <Icon name={props.icon} size="md" color="#94A3B8" />
                    <View style={styles.textContainer}>
                        <Text style={styles.label}>{props.label}</Text>
                        {props.description && (
                            <Text style={styles.description}>{props.description}</Text>
                        )}
                    </View>
                    <Switch
                        value={props.value}
                        onValueChange={props.onValueChange}
                        trackColor={{ false: '#334155', true: '#38BDF8' }}
                        thumbColor={props.value ? '#F8FAFC' : '#94A3B8'}
                    />
                </View>
            </Card>
        );
    }

    return (
        <Card onPress={props.onPress} style={styles.card}>
            <View style={styles.row}>
                <Icon name={props.icon} size="md" color="#94A3B8" />
                <View style={styles.textContainer}>
                    <Text style={styles.label}>{props.label}</Text>
                    {'description' in props && props.description && (
                        <Text style={styles.description}>{props.description}</Text>
                    )}
                </View>
                {'value' in props ? (
                    <Text style={styles.valueText}>{props.value}</Text>
                ) : (
                    <Icon name="chevron-right" size="sm" color="#64748B" />
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 14,
        backgroundColor: '#1E293B',
        marginVertical: 4,
        borderRadius: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F8FAFC',
    },
    description: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#38BDF8',
    },
});