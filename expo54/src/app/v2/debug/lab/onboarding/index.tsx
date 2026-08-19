import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import React from "react";
import { Text } from "react-native";
import { OnboardingFlowPrototype } from "@/src/debug/ui-lab/onboarding/onboarding-flow";

type Scenario = "withReminders" | "withoutReminders";

export default function LabOnboardingRoute() {
  const [scenario, setScenario] = React.useState<Scenario>("withReminders");

  return (
    <DebugScreen
      title="Onboarding"
      description="Pick a fixture and inspect the static onboarding prototype."
    >
      <DebugSection title="Scenario">
        <DebugAction
          label="With reminders"
          detail={scenario === "withReminders" ? "Selected" : undefined}
          onPress={() => setScenario("withReminders")}
        />
        <DebugAction
          label="Without reminders"
          detail={scenario === "withoutReminders" ? "Selected" : undefined}
          onPress={() => setScenario("withoutReminders")}
        />
        <Text>
          {scenario === "withReminders"
            ? "Reminders supported"
            : "Reminders unsupported"}
        </Text>
      </DebugSection>

      <OnboardingFlowPrototype remindersSupported={scenario === "withReminders"} />
    </DebugScreen>
  );
}
