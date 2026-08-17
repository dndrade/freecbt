import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { debugNavItems } from "@/src/debug/navigation";
import { useRouter } from "expo-router";
import React from "react";

export default function DebugIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="Debug"
      description="Choose a development area."
    >
      <DebugSection title="Areas">
        {debugNavItems.map((item) => (
          <DebugAction
            key={item.href}
            label={item.title}
            detail={item.description}
            onPress={() => router.push(item.href)}
          />
        ))}
      </DebugSection>
    </DebugScreen>
  );
}
