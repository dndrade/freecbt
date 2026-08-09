import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Settings } from "@/src/model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Dialog, RadioGroup } from "heroui-native";
import React, { useState } from "react";

export default function Journal() {
  return <LoadModel ready={Ready} />;
}

function Ready({ model, dispatch, translate: t }: ModelLoadedProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyLabel =
    model.settings.historyLabels === "automatic-thought"
      ? t("settings.history.button.automatic")
      : t("settings.history.button.alternative");

  return (
    <Screen>
      <SettingsHeader title={t("settings.journal.header")} />
      <SettingsCard className="mt-2">
        <SettingsRow
          type="value"
          iconName="tag"
          iconColor="pink"
          label={t("settings.journal.history.label")}
          value={historyLabel}
          onPress={() => setHistoryOpen(true)}
        />
      </SettingsCard>

      <Dialog isOpen={historyOpen} onOpenChange={setHistoryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close />
            <Dialog.Title>{t("settings.journal.history.label")}</Dialog.Title>
            <RadioGroup
              value={model.settings.historyLabels}
              onValueChange={(v) => {
                dispatch(Action.setHistoryLabel(v as Settings.HistoryLabel));
                setHistoryOpen(false);
              }}
            >
              <RadioGroup.Item value="alternative-thought">
                {t("settings.history.button.alternative")}
              </RadioGroup.Item>
              <RadioGroup.Item value="automatic-thought">
                {t("settings.history.button.automatic")}
              </RadioGroup.Item>
            </RadioGroup>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
