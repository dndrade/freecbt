import { Redirect } from "expo-router";

export default function BackupDemoRedirect() {
  return <Redirect href="/v2/debug/diagnostics/backup" />;
}
