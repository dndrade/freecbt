import { localeTags, type LocaleTag, type TranslateFn } from "@/src/i18n/use-i18n";
import { Action, Model } from "@/src/model";
import { Feather } from "@expo/vector-icons";
import { PressableFeedback, RadioGroup, Typography, useThemeColor } from "heroui-native";
import React from "react";
import { View } from "react-native";

// Inner content only - the caller hosts the SettingsSheet so switching
// between the general root view and this one doesn't unmount/remount the
// underlying bottom sheet mid-presentation.
export function LanguagePickerContent(props: {
  model: Model.Ready;
  dispatch: (a: Action.Action) => void;
  translate: TranslateFn;
  onBack: () => void;
}) {
  const { model, dispatch, translate: t, onBack } = props;
  const accent = useThemeColor("accent");
  const localeOptions: readonly { value: LocaleTag | ""; label: string }[] = [
    { value: "", label: t("settings.locale.default") },
    ...localeTags
      .filter((locale) => !locale.startsWith("_"))
      .map((locale) => ({ value: locale, label: t(`settings.locale.list.${locale}`) })),
  ];

  return (
    <View className="mt-2 gap-3">
      <PressableFeedback
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("settings.general.header")}
        className="flex-row items-center gap-1 px-2 py-2"
      >
        <Feather name="chevron-left" size={16} color={accent} />
        <Typography type="body">{t("settings.general.header")}</Typography>
      </PressableFeedback>
      <RadioGroup
        className="gap-2"
        value={model.settings.locale ?? ""}
        onValueChange={(v) => {
          dispatch(Action.setLocale(v === "" ? null : (v as LocaleTag)));
          onBack();
        }}
      >
        {localeOptions.map((o) => (
          <RadioGroup.Item key={o.value} value={o.value}>
            {o.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup>
      <Typography type="body-sm" color="muted" className="px-2">
        {t("settings.locale.contribute")}
      </Typography>
    </View>
  );
}
