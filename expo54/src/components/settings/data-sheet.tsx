import * as Routes from "@/src/routes";
import { TranslateFn } from "@/src/i18n/use-i18n";
import { SettingsCard } from "./settings-card";
import { SettingsRow } from "./settings-row";
import { SettingsSheet, useDismissThenNavigate } from "./settings-sheet";
import React from "react";

export function DataSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, translate: t } = props;
  const { dismissThenNavigate, onClosed } = useDismissThenNavigate(onOpenChange);

  return (
    <SettingsSheet isOpen={isOpen} onOpenChange={onOpenChange} onClosed={onClosed} title={t("settings.data.header")}>
      <SettingsCard className="mt-2">
        <SettingsRow
          type="nav"
          iconName="hard-drive"
          iconColor="yellow"
          label={t("settings.data.backup.label")}
          description={t("settings.data.backup.description")}
          onPress={() => dismissThenNavigate(Routes.backupV2())}
        />
        <SettingsRow
          type="nav"
          iconName="file-text"
          iconColor="pink"
          label={t("settings.data.export.label")}
          description={t("settings.data.export.description")}
          onPress={() => dismissThenNavigate(Routes.exportV2())}
        />
      </SettingsCard>
    </SettingsSheet>
  );
}
