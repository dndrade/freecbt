import { useDefaultStyle } from "@/src/hooks/use-style";
import React from "react";
import { Pressable, Text, View } from "react-native";

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
        <Text style={[s.buttonText]}>{props.label}</Text>
      </Pressable>

      {props.detail ? (
        <Text style={[s.text, s.my2]}>{props.detail}</Text>
      ) : null}
    </View>
  );
}
