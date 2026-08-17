import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function DiagnosticsIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="Feature Diagnostics"
      description="Inspect backup and notification flows."
    >
      <DebugSection title="Backup">
        <DebugAction
          label="Backup"
          detail="Recovery-key and backup diagnostics"
          onPress={() => router.push("/v2/debug/diagnostics/backup")}
        />
      </DebugSection>

      <DebugSection title="Notifications">
        <DebugAction
          label="Notifications"
          detail="Verify push notification permissions, tokens, and scheduling"
          onPress={() => router.push("/v2/debug/diagnostics/notifications")}
        />
      </DebugSection>
    </DebugScreen>
  );
}
