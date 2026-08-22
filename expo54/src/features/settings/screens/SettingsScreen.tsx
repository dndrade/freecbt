// src/features/settings/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Modal, Text, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { StandardScreen } from '@/shared/components';
import { useSettings } from '../hooks/useSettings';
import { SettingRow } from '../components/SettingRow';
import { LanguagePicker } from '../components/LanguagePicker';

const SOURCE_URL = 'https://github.com/erosson/freecbt';
const PRIVACY_URL = 'https://github.com/erosson/freecbt/blob/master/PRIVACY.md';
const ISSUES_URL = 'https://github.com/erosson/freecbt/issues';

export const SettingsScreen: React.FC = () => {
    const { t } = useTranslation(['common']);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

    const { settings, initialize, setReminders } = useSettings();
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    useEffect(() => {
        void initialize();
    }, [initialize]);

    return (
        <StandardScreen title={t('settings.header', 'Settings')}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* General Preferences */}
                <Text style={styles.sectionHeader}>{t('settings.hub.general.label', 'General')}</Text>
                <SettingRow
                    type="toggle"
                    icon="bell"
                    label={t('settings.general.notifications.label', 'Reminders')}
                    value={settings?.reminders ?? false}
                    onValueChange={(val) => void setReminders(val)}
                />
                <SettingRow
                    type="value"
                    icon="globe"
                    label={t('settings.general.language.label', 'Language')}
                    value={settings?.locale ? settings.locale.toUpperCase() : 'DEFAULT'}
                    onPress={() => setIsLanguageModalOpen(true)}
                />

                {/* Support & Legal */}
                <Text style={styles.sectionHeader}>{t('settings.hub.support.label', 'Support')}</Text>
                <SettingRow
                    type="nav"
                    icon="github"
                    label={t('settings.support.issue.label', 'Report Issue')}
                    onPress={() => void Linking.openURL(ISSUES_URL)}
                />
                <SettingRow
                    type="nav"
                    icon="shield"
                    label={t('settings.privacy', 'Privacy Policy')}
                    onPress={() => void Linking.openURL(PRIVACY_URL)}
                />
                <SettingRow
                    type="nav"
                    icon="code"
                    label={t('settings.about.source.label', 'Source Code')}
                    onPress={() => void Linking.openURL(SOURCE_URL)}
                />

                {/* Version Info */}
                <Text style={styles.versionFooter}>Version {appVersion}</Text>
            </ScrollView>

            {/* Language Picker Bottom Modal */}
            <Modal
                visible={isLanguageModalOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsLanguageModalOpen(false)}
            >
                <StandardScreen
                    title={t('settings.general.language.label', 'Language')}
                    leftAction={{
                        icon: 'close',
                        accessibilityLabel: t('common:actions.cancel', 'Close'),
                        onPress: () => setIsLanguageModalOpen(false),
                    }}
                >
                    <LanguagePicker onDismiss={() => setIsLanguageModalOpen(false)} />
                </StandardScreen>
            </Modal>
        </StandardScreen>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingVertical: 12,
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 4,
    },
    versionFooter: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 13,
        marginTop: 24,
        marginBottom: 16,
    },
});