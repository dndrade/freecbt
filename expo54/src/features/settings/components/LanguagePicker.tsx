// src/features/settings/components/LanguagePicker.tsx
import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Typography } from "heroui-native";
import { Card } from "@/shared/components";
import {
  localeTags as supportedLanguages,
  useTranslate,
  type LocaleTag as SupportedLanguage,
} from "@/i18n/use-i18n";
import { useSettings } from "../hooks/useSettings";

interface LanguagePickerProps {
  onDismiss: () => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  onDismiss,
}) => {
  const t = useTranslate();
  const currentLocale = useSettings((s) => s.settings?.locale ?? null);
  const setLocale = useSettings((s) => s.setLocale);

  const handleSelect = (lang: SupportedLanguage | null) => {
    void setLocale(lang);
    onDismiss();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* System Default Option */}
      <Card
        onPress={() => handleSelect(null)}
        style={[styles.itemCard, currentLocale === null && styles.selectedCard]}
      >
        <Typography.Paragraph
          style={[
            styles.langText,
            currentLocale === null && styles.selectedText,
          ]}
        >
          {t("settings.locale.default")}
        </Typography.Paragraph>
      </Card>

      {/* Full 20+ Language List */}
      {supportedLanguages
        .filter((lang) => !lang.startsWith("_"))
        .map((lang) => {
          const isSelected = currentLocale === lang;
          return (
            <Card
              key={lang}
              onPress={() => handleSelect(lang)}
              style={[styles.itemCard, isSelected && styles.selectedCard]}
            >
              <Typography.Paragraph
                style={[styles.langText, isSelected && styles.selectedText]}
              >
                {lang.toUpperCase()} — {t(`settings.locale.list.${lang}`)}
              </Typography.Paragraph>
            </Card>
          );
        })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 12,
  },
  itemCard: {
    padding: 14,
    backgroundColor: "#1E293B",
    borderRadius: 10,
  },
  selectedCard: {
    borderColor: "#38BDF8",
    borderWidth: 1.5,
    backgroundColor: "#0F2744",
  },
  langText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#F8FAFC",
  },
  selectedText: {
    color: "#38BDF8",
    fontWeight: "700",
  },
});
