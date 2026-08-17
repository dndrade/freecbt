import { LoadModel } from "@/src/hooks/use-model";
import { BackupSettingsScreen } from "@/src/features/backup/backup-settings-screen";
import React from "react";

export default function BackupSetupCurrent() {
  return <LoadModel ready={BackupSettingsScreen} />;
}
