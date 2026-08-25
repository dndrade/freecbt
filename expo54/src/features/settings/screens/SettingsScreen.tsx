// src/features/settings/screens/SettingsScreen.tsx
import React, { useState } from "react";
import { StyleSheet, ScrollView, Modal, Linking } from "react-native";
import { Typography } from "heroui-native";
import Constants from "expo-constants";
import {
  StandardScreen,
  HeaderActionButton,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { useSettings } from "../hooks/useSettings";
import { SettingRow } from "../components/SettingRow";
import { LanguagePicker } from "../components/LanguagePicker";
import * as Routes from "@/src/routes";
import { useRouter } from "expo-router";

const SOURCE_URL = "https://github.com/erosson/freecbt";
const PRIVACY_URL = "https://github.com/erosson/freecbt/blob/master/PRIVACY.md";
const ISSUES_URL = "https://github.com/erosson/freecbt/issues";

export const SettingsScreen: React.FC = () => {
  const t = useTranslate();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const router = useRouter();

  const { settings, setReminders } = useSettings();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  useScreenHeader({ title: t("settings.header") });

  return (
    <StandardScreen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* General Preferences */}
        <Typography.Paragraph type="body-sm" style={styles.sectionHeader}>
          {t("settings.hub.general.label")}
        </Typography.Paragraph>
        <SettingRow
          type="toggle"
          icon="bell"
          label={t("settings.general.notifications.label")}
          value={settings?.reminders ?? false}
          onValueChange={(val) => void setReminders(val)}
        />
        <SettingRow
          type="value"
          icon="globe"
          label={t("settings.general.language.label")}
          value={settings?.locale ? settings.locale.toUpperCase() : "DEFAULT"}
          onPress={() => setIsLanguageModalOpen(true)}
        />
        <SettingRow
          type="nav"
          icon="lock"
          label={t("lock_screen.hub_off_cta")}
          onPress={() => router.push(Routes.lockSettingsV2())}
        />

        {/* Support & Legal */}
        <Typography.Paragraph type="body-sm" style={styles.sectionHeader}>
          {t("settings.hub.support.label")}
        </Typography.Paragraph>
        <SettingRow
          type="nav"
          icon="github"
          label={t("settings.support.issue.label")}
          onPress={() => void Linking.openURL(ISSUES_URL)}
        />
        <SettingRow
          type="nav"
          icon="shield"
          label={t("settings.privacy")}
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        />
        <SettingRow
          type="nav"
          icon="code"
          label={t("settings.about.source.label")}
          onPress={() => void Linking.openURL(SOURCE_URL)}
        />

        {/* Version Info */}
        <Typography.Paragraph type="body-sm" style={styles.versionFooter}>
          {t("settings.about.version", { version: appVersion })}
        </Typography.Paragraph>
      </ScrollView>

      {/* Language Picker Bottom Modal */}
      <Modal
        visible={isLanguageModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsLanguageModalOpen(false)}
      >
        <StandardScreen>
          <HeaderActionButton
            action={{
              icon: "close",
              accessibilityLabel: t("accessibility.close_button"),
              onPress: () => setIsLanguageModalOpen(false),
            }}
          />
          <Typography.Heading type="h4" className="text-center">
            {t("settings.general.language.label")}
          </Typography.Heading>
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
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 4,
  },
  versionFooter: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    marginTop: 24,
    marginBottom: 16,
  },
});
