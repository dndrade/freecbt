import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import {
  getLabFamily,
  getLabScenario,
  type LabFamily,
  type LabScenario,
} from "@/src/debug/lab/catalog";
import { useRouter } from "expo-router";
import React from "react";

export function LabFamilyScreen(props: { readonly familyId: LabFamily["id"] }) {
  const router = useRouter();
  const family = getLabFamily(props.familyId);

  if (!family.scenarios) {
    throw new Error(`lab family has no scenarios: ${family.id}`);
  }

  return (
    <DebugScreen
      title={family.title}
      description={family.description ?? "Select a scenario."}
    >
      <DebugSection title="Scenarios">
        {family.scenarios.map((scenario) => (
          <DebugAction
            key={scenario.id}
            label={scenario.title}
            detail={scenario.description}
            onPress={() => router.push(scenario.href)}
          />
        ))}
      </DebugSection>
    </DebugScreen>
  );
}

export function LabScenarioScreen(props: {
  readonly familyId: LabFamily["id"];
  readonly scenarioId: LabScenario["id"];
}) {
  const router = useRouter();
  const scenario = getLabScenario(props.familyId, props.scenarioId);

  return (
    <DebugScreen
      title={scenario.title}
      description={scenario.description ?? "Select a variant."}
    >
      <DebugSection title="Variants">
        {scenario.variants.map((variant) => (
          <DebugAction
            key={variant.id}
            label={variant.title}
            detail={variant.description}
            onPress={() => router.push(variant.href)}
          />
        ))}
      </DebugSection>
    </DebugScreen>
  );
}
