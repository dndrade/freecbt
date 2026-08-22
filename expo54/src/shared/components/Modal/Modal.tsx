import React from 'react';
import {
    Modal as NativeModal,
    View,
    StyleSheet,
    TouchableWithoutFeedback,
    ViewStyle,
} from 'react-native';

export interface AppModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    dismissible?: boolean;
    style?: ViewStyle;
}

export const Modal: React.FC<AppModalProps> = ({
                                                   visible,
                                                   onClose,
                                                   children,
                                                   dismissible = true,
                                                   style,
                                               }) => {
    return (
        <NativeModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={dismissible ? onClose : undefined}
            accessibilityViewIsModal={true}
        >
            <TouchableWithoutFeedback onPress={dismissible ? onClose : undefined}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.card, style]}>{children}</View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </NativeModal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#334155',
    },
});