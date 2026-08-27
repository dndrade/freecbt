import React from "react";
import { View } from "react-native";
import { Typography, useThemeColor } from "heroui-native";
import { useI18n } from "@/i18n/use-i18n";

export type StepChipId = "catch" | "check" | "challenge" | "change";

const STEPS = [
  { id: "catch", labelKey: "onboarding_screen.guided.catch" },
  { id: "check", labelKey: "onboarding_screen.guided.check" },
  { id: "challenge", labelKey: "onboarding_screen.guided.challenge" },
  { id: "change", labelKey: "onboarding_screen.guided.change" },
] as const;

export interface StepChipRowProps {
  current: StepChipId;
}

export const StepChipRow: React.FC<StepChipRowProps> = ({ current }) => {
  const i18n = useI18n();
  const yellow = useThemeColor("accent");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted");

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {STEPS.map((step) => {
        const isCurrent = step.id === current;

        return (
          <View
            key={step.id}
            accessibilityState={isCurrent ? { selected: true } : undefined}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: isCurrent ? "transparent" : border,
              backgroundColor: isCurrent ? yellow : "transparent",
            }}
          >
            <Typography
              type="body-xs"
              style={{
                fontWeight: "700",
                color: isCurrent ? "#3d3212" : muted,
              }}
            >
              {i18n.t(step.labelKey)}
            </Typography>
          </View>
        );
      })}
    </View>
  );
};
