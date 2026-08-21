import { BackupSettingsScreen } from "@/features/backup/backup-settings-screen";
import { LoadModel } from "@/hooks/use-model";

export default function Backup() {
  return <LoadModel ready={BackupSettingsScreen} />;
}