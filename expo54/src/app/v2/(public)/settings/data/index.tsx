import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Link } from "expo-router";
import React from "react";

export default function Data() {
  return <LoadModel ready={Ready} />;
}

function Ready({ translate: t }: ModelLoadedProps) {
  return (
    <Screen>
      <SettingsHeader title={t("settings.data.header")} />
      <SettingsCard className="mt-2">
        <Link href={Routes.backupV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="hard-drive"
            iconColor="yellow"
            label={t("settings.data.backup.label")}
            description={t("settings.data.backup.description")}
          />
        </Link>
        <Link href={Routes.exportV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="file-text"
            iconColor="pink"
            label={t("settings.data.export.label")}
            description={t("settings.data.export.description")}
          />
        </Link>
      </SettingsCard>
    </Screen>
  );
}
