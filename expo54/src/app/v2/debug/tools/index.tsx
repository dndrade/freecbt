import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function ToolsIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="Tools"
      description="Inspect runtime state and the app foundation."
    >
      <DebugSection title="Inspection">
        <DebugAction
          label="Debug Inspector"
          detail="Inspect app state and development diagnostics"
          onPress={() => router.push("/v2/debug/tools/debug")}
        />
        <DebugAction
          label="Theme Probe"
          detail="Preview the UI foundation"
          onPress={() => router.push("/v2/debug/tools/theme-probe")}
        />
        <DebugAction
          label="AsyncStorage Dump"
          detail="Inspect stored key/value data"
          onPress={() => router.push("/v2/debug/tools/asyncstorage-dump")}
        />
      </DebugSection>
    </DebugScreen>
  );
}
