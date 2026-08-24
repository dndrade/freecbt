import { useDefaultStyle } from "@/src/hooks/use-style";
import React from "react";
import { Pressable, View } from "react-native";
import { Typography } from "heroui-native";

export interface DebugActionProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  detail?: string;
}

export function DebugAction(props: DebugActionProps) {
  const s = useDefaultStyle();

  return (
    <View style={[s.my2]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: props.disabled ?? false }}
        disabled={props.disabled}
        onPress={props.onPress}
        style={[s.button, s.p3]}
      >
        <Typography type="body-sm">{props.label}</Typography>
      </Pressable>

      {props.detail ? (
        <Typography type="body-sm" className="my-2">{props.detail}</Typography>
      ) : null}
    </View>
  );
}
