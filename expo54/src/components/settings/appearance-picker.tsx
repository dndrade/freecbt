import { TranslateFn } from "@/src/i18n/use-i18n";
import { Action, Model } from "@/src/model";
import { SettingsSheet } from "./settings-sheet";
import { RadioGroup } from "heroui-native";
import React from "react";

export function AppearancePicker(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model.Ready;
  dispatch: (a: Action.Action) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, model, dispatch, translate: t } = props;

  return (
    <SettingsSheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("settings.appearance.theme.label")}>
      <RadioGroup
        value={model.settings.theme ?? "default"}
        onValueChange={(v) => {
          dispatch(Action.setTheme(v === "default" ? null : (v as "light" | "dark")));
          onOpenChange(false);
        }}
      >
        <RadioGroup.Item value="default">{t("settings.theme.default")}</RadioGroup.Item>
        <RadioGroup.Item value="light">{t("settings.theme.light")}</RadioGroup.Item>
        <RadioGroup.Item value="dark">{t("settings.theme.dark")}</RadioGroup.Item>
      </RadioGroup>
    </SettingsSheet>
  );
}
