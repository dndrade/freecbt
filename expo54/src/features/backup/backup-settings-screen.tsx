import {
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { backupFlags } from "./backup-flags";
import { EncryptedBackupExport } from "./encrypted-backup-export";
import { EncryptedBackupImport } from "./encrypted-backup-import";
import { LegacyBackupExport } from "./legacy-backup-export";
import { LegacyBackupImport } from "./legacy-backup-import";
import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { Typography } from "heroui-native";

export function BackupSettingsScreen(props: ModelLoadedProps): React.ReactNode {
  const { style: s, translate: t } = props;
  const router = useRouter();

  const ExportControl = backupFlags.encryptedBackup
    ? EncryptedBackupExport
    : LegacyBackupExport;

  const ImportControl = backupFlags.encryptedBackup
    ? EncryptedBackupImport
    : LegacyBackupImport;

  useScreenHeader({
    title: t("nav.backup"),
    leftAction: backHeaderAction(() => router.back()),
  });

  return (
    <StandardScreen>
      <View className="mt-2">
        <Typography type="body-sm" className="my-2">
          {t("backup_screen.export.description")}
        </Typography>

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
    </StandardScreen>
  );
}
