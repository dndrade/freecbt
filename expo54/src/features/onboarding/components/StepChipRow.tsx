import React from "react";
import { View } from "react-native";
import { Typography, useThemeColor } from "heroui-native";

export type StepChipId = "catch" | "check" | "challenge" | "change";

const STEPS: { id: StepChipId; label: string }[] = [
  { id: "catch", label: "Catch it" },
  { id: "check", label: "Check it" },
  { id: "challenge", label: "Challenge it" },
  { id: "change", label: "Change it" },
];

export interface StepChipRowProps {
  current: StepChipId;
}

export const StepChipRow: React.FC<StepChipRowProps> = ({ current }) => {
  const yellow = useThemeColor("accent");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted");

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
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
              {step.label}
            </Typography>
          </View>
        );
      })}
    </View>
  );
};
