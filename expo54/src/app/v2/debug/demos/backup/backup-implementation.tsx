import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { backupFlags } from "@/src/features/backup/backup-flags";
import { EncryptedBackupExport } from "@/src/features/backup/encrypted-backup-export";
import { EncryptedBackupImport } from "@/src/features/backup/encrypted-backup-import";
import { LegacyBackupExport } from "@/src/features/backup/legacy-backup-export";
import { LegacyBackupImport } from "@/src/features/backup/legacy-backup-import";
import {
  LoadModel,
  ModelLoadedProps,
} from "@/src/hooks/use-model";
import React, { useState } from "react";
import { Text } from "react-native";

type BackupMode = "legacy" | "encrypted";

function productionMode(): BackupMode {
  return backupFlags.encryptedBackup ? "encrypted" : "legacy";
}

export default function BackupImplementationDemo() {
  if (!__DEV__) {
    return null;
  }

  return <LoadModel ready={Ready} />;
}

function Ready(props: ModelLoadedProps) {
  const { style: s, translate: t } = props;
  const [mode, setMode] = useState<BackupMode>(productionMode());

  const ExportControl =
    mode === "encrypted"
      ? EncryptedBackupExport
      : LegacyBackupExport;

  const ImportControl =
    mode === "encrypted"
      ? EncryptedBackupImport
      : LegacyBackupImport;

  return (
    <DebugScreen
      title="Backup implementation"
      description="Verify rollout and rollback selection without editing production flags."
      metadata={
        <>
          <Text style={[s.text]}>
            Production default: {productionMode()}
          </Text>
          <Text style={[s.text]}>
            Debug selection: {mode}
          </Text>
        </>
      }
    >
      <DebugSection title="Choose implementation">
        <DebugAction
          label="Match production default"
          disabled={mode === productionMode()}
          onPress={() => setMode(productionMode())}
        />
        <DebugAction
          label="Use encrypted Archive-v3"
          disabled={mode === "encrypted"}
          onPress={() => setMode("encrypted")}
        />
        <DebugAction
          label="Use legacy plaintext backup"
          disabled={mode === "legacy"}
          onPress={() => setMode("legacy")}
        />
      </DebugSection>

      <DebugSection title="Export">
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.export.description")}
        </Text>
        <ExportControl
          model={props.model}
          style={props.style}
          translate={props.translate}
        />
      </DebugSection>

      <DebugSection title="Import">
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.import.description")}
        </Text>
        <ImportControl
          model={props.model}
          dispatch={props.dispatch}
          style={props.style}
          translate={props.translate}
        />
      </DebugSection>
    </DebugScreen>
  );
}
