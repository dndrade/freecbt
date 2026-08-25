import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function DemosIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="Logic Demos"
      description="Reference implementations and behavior demos."
    >
      <DebugSection title="Reference demos">
        <DebugAction
          label="Counter"
          detail="Simple reducer demo"
          onPress={() => router.push("/v2/debug/demos/counter")}
        />
        <DebugAction
          label="Promise"
          detail="Promise rendering patterns"
          onPress={() => router.push("/v2/debug/demos/promise")}
        />
      </DebugSection>
    </DebugScreen>
  );
}
