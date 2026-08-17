import { Screen } from "@/src/components";
import { SettingsHeader } from "@/src/components/settings/settings-header";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { backupFlags } from "./backup-flags";
import { EncryptedBackupExport } from "./encrypted-backup-export";
import { EncryptedBackupImport } from "./encrypted-backup-import";
import { LegacyBackupExport } from "./legacy-backup-export";
import { LegacyBackupImport } from "./legacy-backup-import";
import React from "react";
import { Text, View } from "react-native";

export function BackupSettingsScreen(
  props: ModelLoadedProps
): React.ReactNode {
  const { style: s, translate: t } = props;

  const ExportControl = backupFlags.encryptedBackup
    ? EncryptedBackupExport
    : LegacyBackupExport;

  const ImportControl = backupFlags.encryptedBackup
    ? EncryptedBackupImport
    : LegacyBackupImport;

  return (
    <Screen>
      <SettingsHeader title={t("nav.backup")} />
      <View className="mt-2">
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.export.description")}
        </Text>

        <ExportControl
          model={props.model}
          style={props.style}
          translate={props.translate}
        />

        <Text style={[s.text, s.my2]}>
          {t("backup_screen.import.description")}
        </Text>

        <ImportControl
          model={props.model}
          dispatch={props.dispatch}
          style={props.style}
          translate={props.translate}
        />
      </View>
    </Screen>
  );
}
