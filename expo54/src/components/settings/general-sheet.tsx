import { Routes } from "@/src";
import { localeTags, LocaleTag, TranslateFn } from "@/src/i18n/use-i18n";
import { useReminders } from "@/src/features/reminders/use-reminders";
import { Action, Model } from "@/src/model";
import { SettingsCard } from "./settings-card";
import { SettingsRow } from "./settings-row";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "./settings-sheet";
import { Feather } from "@expo/vector-icons";
import { RadioGroup, Typography } from "heroui-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";

type GeneralView = "root" | "language";

export function GeneralSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model.Ready;
  dispatch: (a: Action.Action) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, model, dispatch, translate: t } = props;
  const reminders = useReminders();
  const [view, setView] = useState<GeneralView>("root");
  const { dismissThenNavigate, onClosed } = useDismissThenNavigate(onOpenChange);

  useResetOnDismiss(isOpen, () => setView("root"));

  const localeOptions: readonly { value: LocaleTag | ""; label: string }[] = [
    { value: "", label: t("settings.locale.default") },
    ...localeTags
      .filter((locale) => !locale.startsWith("_"))
      .map((locale) => ({ value: locale, label: t(`settings.locale.list.${locale}`) })),
  ];
  const currentLocale =
    localeOptions.find((o) => o.value === (model.settings.locale ?? "")) ?? localeOptions[0]!;

  return (
    <SettingsSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title={view === "language" ? t("settings.general.language.label") : t("settings.general.header")}
    >
      {view === "root" ? (
        <SettingsCard className="mt-2">
          <SettingsRow
            type="toggle"
            iconName="bell"
            iconColor="pink"
            label={t("settings.general.notifications.label")}
            isSelected={model.settings.reminders}
            onSelectedChange={(v) => {
              void reminders.set(v, dispatch, t);
            }}
          />
          <SettingsRow
            type="nav"
            iconName="lock"
            iconColor="purple"
            label={t("settings.general.applock.label")}
            description={
              model.settings.pincode
                ? t("settings.pincode.button.update")
                : t("settings.general.applock.description")
            }
            onPress={() => dismissThenNavigate(Routes.lockUpdateV2())}
          />
          <SettingsRow
            type="value"
            iconName="globe"
            iconColor="yellow"
            label={t("settings.general.language.label")}
            value={currentLocale.label}
            onPress={() => setView("language")}
          />
        </SettingsCard>
      ) : (
        <View className="mt-2">
          <Pressable
            onPress={() => setView("root")}
            accessibilityRole="button"
            className="flex-row items-center gap-1 p-2"
          >
            <Feather name="chevron-left" size={16} />
            <Typography type="body">{t("settings.general.header")}</Typography>
          </Pressable>
          <RadioGroup
            value={model.settings.locale ?? ""}
            onValueChange={(v) => {
              dispatch(Action.setLocale(v === "" ? null : (v as LocaleTag)));
              setView("root");
            }}
          >
            {localeOptions.map((o) => (
              <RadioGroup.Item key={o.value} value={o.value}>
                {o.label}
              </RadioGroup.Item>
            ))}
          </RadioGroup>
          <Typography type="body-sm" color="muted" className="mt-2 px-2">
            {t("settings.locale.contribute")}
          </Typography>
        </View>
      )}
    </SettingsSheet>
  );
}
