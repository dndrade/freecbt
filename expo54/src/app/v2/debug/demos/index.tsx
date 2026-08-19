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
        <DebugAction
          label="Hooks Init"
          detail="Hook initialization patterns"
          onPress={() => router.push("/v2/debug/demos/hooks-init")}
        />
        <DebugAction
          label="Pure Elm Architecture"
          detail="Elm-style reducer demo"
          onPress={() => router.push("/v2/debug/demos/pure-elm-arch")}
        />
      </DebugSection>
    </DebugScreen>
  );
}
