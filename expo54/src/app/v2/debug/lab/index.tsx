import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { labFamilies } from "@/src/debug/lab/catalog";
import { useRouter } from "expo-router";
import React from "react";

export default function LabIndex() {
  const router = useRouter();

  return (
    <DebugScreen
      title="UI/UX Lab"
      description="Prototype and evaluate production-candidate user experiences."
    >
      <DebugSection title="Families">
        {labFamilies.map((family) => (
          <DebugAction
            key={family.id}
            label={family.title}
            detail={family.description}
            onPress={() => router.push(family.href)}
          />
        ))}
      </DebugSection>
    </DebugScreen>
  );
}
