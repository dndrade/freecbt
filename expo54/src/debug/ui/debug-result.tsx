import { useDefaultStyle } from "@/src/hooks/use-style";
import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";

export interface DebugResultProps {
  value: string;
  running?: boolean;
  runningLabel?: string;
}

export function DebugResult(props: DebugResultProps) {
  const s = useDefaultStyle();

  const text = props.running
    ? props.runningLabel ?? "Running…"
    : props.value;

  return (
    <View style={[s.border, s.p3, s.my2]}>
      <Typography type="body-sm" selectable>
        {text}
      </Typography>
    </View>
  );
}
