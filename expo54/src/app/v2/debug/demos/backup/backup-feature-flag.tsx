import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { EncryptedBackupExport } from "@/src/features/backup/encrypted-backup-export";
import { EncryptedBackupImport } from "@/src/features/backup/encrypted-backup-import";
import { LegacyBackupExport } from "@/src/features/backup/legacy-backup-export";
import { LegacyBackupImport } from "@/src/features/backup/legacy-backup-import";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import React, { useState } from "react";
import { Text } from "react-native";

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
      <DebugScreen
          title="Backup feature flag"
          description="Switch between the legacy and encrypted backup implementations without changing the production feature flag."
          metadata={
            <Text style={[s.text]}>
              Active implementation: {mode}
            </Text>
          }
      >
        <DebugSection title="Implementation">
          <DebugAction
              label="Use legacy backup"
              disabled={mode === "legacy"}
              onPress={() => setMode("legacy")}
          />

          <DebugAction
              label="Use encrypted backup"
              disabled={mode === "encrypted"}
              onPress={() => setMode("encrypted")}
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