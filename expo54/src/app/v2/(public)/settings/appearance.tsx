import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Dialog, RadioGroup } from "heroui-native";
import React, { useState } from "react";

export default function Appearance() {
  return <LoadModel ready={Ready} />;
}

function Ready({ model, dispatch, translate: t }: ModelLoadedProps) {
  const [themeOpen, setThemeOpen] = useState(false);
  const themeLabel =
    model.settings.theme === "light"
      ? t("settings.theme.light")
      : model.settings.theme === "dark"
        ? t("settings.theme.dark")
        : t("settings.theme.default");

  return (
    <Screen>
      <SettingsHeader title={t("settings.appearance.header")} />
      <SettingsCard className="mt-2">
        <SettingsRow
          type="value"
          iconName="moon"
          iconColor="purple"
          label={t("settings.appearance.theme.label")}
          value={themeLabel}
          onPress={() => setThemeOpen(true)}
        />
      </SettingsCard>

      <Dialog isOpen={themeOpen} onOpenChange={setThemeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close />
            <Dialog.Title>{t("settings.appearance.theme.label")}</Dialog.Title>
            <RadioGroup
              value={model.settings.theme ?? "default"}
              onValueChange={(v) => {
                dispatch(
                  Action.setTheme(v === "default" ? null : (v as "light" | "dark"))
                );
                setThemeOpen(false);
              }}
            >
              <RadioGroup.Item value="default">{t("settings.theme.default")}</RadioGroup.Item>
              <RadioGroup.Item value="light">{t("settings.theme.light")}</RadioGroup.Item>
              <RadioGroup.Item value="dark">{t("settings.theme.dark")}</RadioGroup.Item>
            </RadioGroup>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </Screen>
  );
}
