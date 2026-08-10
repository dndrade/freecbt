import { Routes } from "@/src";
import { TranslateFn } from "@/src/i18n/use-i18n";
import { SettingsCard } from "./settings-card";
import { SettingsRow } from "./settings-row";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "./settings-sheet";
import { Typography } from "heroui-native";
import React, { useState } from "react";

export function WellbeingSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, translate: t } = props;
  const { dismissThenNavigate, onClosed } = useDismissThenNavigate(onOpenChange);
  const [showCrisisTodo, setShowCrisisTodo] = useState(false);

  useResetOnDismiss(isOpen, () => setShowCrisisTodo(false));

  return (
    <SettingsSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title={t("settings.wellbeing.header")}
    >
      <SettingsCard className="mt-2">
        <SettingsRow
          type="nav"
          iconName="book-open"
          iconColor="yellow"
          label={t("settings.wellbeing.learn.label")}
          description={t("settings.wellbeing.learn.description")}
          onPress={() => dismissThenNavigate(Routes.introV2())}
        />
        <SettingsRow
          type="nav"
          iconName="phone"
          iconColor="pink"
          label={t("settings.wellbeing.crisis.label")}
          description={t("settings.wellbeing.crisis.description")}
          onPress={() => setShowCrisisTodo(true)}
        />
      </SettingsCard>
      {showCrisisTodo && (
        <Typography type="body-sm" color="muted" className="mt-3 px-1">
          {t("settings.wellbeing.crisis.todo")}
        </Typography>
      )}
    </SettingsSheet>
  );
}
