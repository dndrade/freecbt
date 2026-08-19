import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function BackupDemosIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="Backup verification"
      description="Choose a focused development-only backup verification workflow."
    >
      <DebugSection title="Production workflow">
        <DebugAction
          label="Run recovery-key workflow"
          onPress={() =>
            router.push(
              "/v2/debug/demos/backup/recovery-key-workflow"
            )
          }
        />
      </DebugSection>

      <DebugSection title="Rollout">
        <DebugAction
          label="Select backup implementation"
          onPress={() =>
            router.push(
              "/v2/debug/demos/backup/backup-implementation"
            )
          }
        />
      </DebugSection>

      <DebugSection title="Cryptography">
        <DebugAction
          label="Run Archive-v3 diagnostics"
          onPress={() =>
            router.push(
              "/v2/debug/demos/backup/archive-crypto-diagnostics"
            )
          }
        />
      </DebugSection>
    </DebugScreen>
  );
}
