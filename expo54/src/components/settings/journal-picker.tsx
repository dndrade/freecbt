import { TranslateFn } from "@/src/i18n/use-i18n";
import { Action, Model, Settings } from "@/src/model";
import { SettingsSheet } from "./settings-sheet";
import { RadioGroup } from "heroui-native";
import React from "react";

export function JournalPicker(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model.Ready;
  dispatch: (a: Action.Action) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, model, dispatch, translate: t } = props;

  return (
    <SettingsSheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("settings.journal.history.label")}>
      <RadioGroup
        value={model.settings.historyLabels}
        onValueChange={(v) => {
          dispatch(Action.setHistoryLabel(v as Settings.HistoryLabel));
          onOpenChange(false);
        }}
      >
        <RadioGroup.Item value="alternative-thought">
          {t("settings.history.button.alternative")}
        </RadioGroup.Item>
        <RadioGroup.Item value="automatic-thought">
          {t("settings.history.button.automatic")}
        </RadioGroup.Item>
      </RadioGroup>
    </SettingsSheet>
  );
}
