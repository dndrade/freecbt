import { backupFlags } from "@/src/features/backup/backup-flags";
import { EncryptedBackupExport } from "@/src/features/backup/encrypted-backup-export";
import { EncryptedBackupImport } from "@/src/features/backup/encrypted-backup-import";
import { LegacyBackupExport } from "@/src/features/backup/legacy-backup-export";
import { LegacyBackupImport } from "@/src/features/backup/legacy-backup-import";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Backup() {
  return <LoadModel ready={Ready} />;
}

export function Ready(props: ModelLoadedProps) {
  const { style: s, translate: t } = props;

  const ExportControl = backupFlags.encryptedBackup
      ? EncryptedBackupExport
      : LegacyBackupExport;

  const ImportControl = backupFlags.encryptedBackup
      ? EncryptedBackupImport
      : LegacyBackupImport;

  return (
      <SafeAreaView style={[s.view]}>
        <View style={[s.container]}>
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
      </SafeAreaView>
  );
}