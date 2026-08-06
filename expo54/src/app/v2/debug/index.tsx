import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function Index() {
    const router = useRouter();
  return (
      <DebugScreen
          title="Developer tools"
          description="Open the navigation drawer to choose a debug page or demo."
      >
          <DebugSection>
              <DebugAction
                  label="Return to FreeCBT"
                  onPress={() => router.push("/v2")}
              />
          </DebugSection>
      </DebugScreen>
  );
}
