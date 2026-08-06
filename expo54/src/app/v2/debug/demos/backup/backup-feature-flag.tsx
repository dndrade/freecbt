import { EncryptedBackupExport } from "@/src/features/backup/encrypted-backup-export";
import { EncryptedBackupImport } from "@/src/features/backup/encrypted-backup-import";
import { LegacyBackupExport } from "@/src/features/backup/legacy-backup-export";
import { LegacyBackupImport } from "@/src/features/backup/legacy-backup-import";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import React, { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BackupMode = "legacy" | "encrypted";

export default function BackupFeatureFlagDemo() {
  return <LoadModel ready={Ready} />;
}

function Ready(props: ModelLoadedProps) {
  const { style: s, translate: t } = props;
  const [mode, setMode] = useState<BackupMode>("legacy");

  const ExportControl =
    mode === "encrypted" ? EncryptedBackupExport : LegacyBackupExport;

  const ImportControl =
    mode === "encrypted" ? EncryptedBackupImport : LegacyBackupImport;

  return (
    <SafeAreaView style={[s.view]}>
      <ScrollView
        contentContainerStyle={[s.container]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.header, s.my2]}>Backup feature-flag demo</Text>

        <Text style={[s.text, s.my2]}>Active implementation: {mode}</Text>

        <View style={[s.my2]}>
          <Button
            title="Use legacy backup"
            disabled={mode === "legacy"}
            onPress={() => setMode("legacy")}
          />
        </View>

        <View style={[s.my2]}>
          <Button
            title="Use encrypted backup"
            disabled={mode === "encrypted"}
            onPress={() => setMode("encrypted")}
          />
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
