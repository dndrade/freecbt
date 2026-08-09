import { Routes } from "@/src";
import { localeTags, LocaleTag } from "@/src/i18n/use-i18n";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { useReminders } from "@/src/features/reminders/use-reminders";
import { Action } from "@/src/model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Dialog, RadioGroup, Typography } from "heroui-native";
import { Link } from "expo-router";
import React, { useState } from "react";

export default function General() {
  return <LoadModel ready={Ready} />;
}

function Ready({ model, dispatch, translate: t }: ModelLoadedProps) {
  const reminders = useReminders();
  const [languageOpen, setLanguageOpen] = useState(false);

  const localeOptions: readonly { value: LocaleTag | ""; label: string }[] = [
    { value: "", label: t("settings.locale.default") },
    ...localeTags
      .filter((locale) => !locale.startsWith("_"))
      .map((locale) => ({ value: locale, label: t(`settings.locale.list.${locale}`) })),
  ];
  const currentLocale =
    localeOptions.find((o) => o.value === (model.settings.locale ?? "")) ?? localeOptions[0]!;

  return (
    <Screen>
      <SettingsHeader title={t("settings.general.header")} />
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
        <Link href={Routes.lockUpdateV2()} asChild>
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
          />
        </Link>
        <SettingsRow
          type="value"
          iconName="globe"
          iconColor="yellow"
          label={t("settings.general.language.label")}
          value={currentLocale.label}
          onPress={() => setLanguageOpen(true)}
        />
      </SettingsCard>

      <Dialog isOpen={languageOpen} onOpenChange={setLanguageOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close />
            <Dialog.Title>{t("settings.general.language.label")}</Dialog.Title>
            <RadioGroup
              value={model.settings.locale ?? ""}
              onValueChange={(v) => {
                dispatch(Action.setLocale(v === "" ? null : (v as LocaleTag)));
                setLanguageOpen(false);
              }}
            >
              {localeOptions.map((o) => (
                <RadioGroup.Item key={o.value} value={o.value}>
                  {o.label}
                </RadioGroup.Item>
              ))}
            </RadioGroup>
            <Typography type="body-sm" color="muted">
              {t("settings.locale.contribute")}
            </Typography>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
