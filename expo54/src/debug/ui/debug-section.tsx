import { useDefaultStyle } from "@/src/hooks/use-style";
import React, { ReactNode } from "react";
import { Text, View } from "react-native";

export interface DebugSectionProps {
  title?: string;
  children: ReactNode;
}

export function DebugSection(props: DebugSectionProps) {
  const s = useDefaultStyle();

  return (
    <View style={[s.my2]}>
      {props.title ? (
        <Text style={[s.subheader, s.my2]}>{props.title}</Text>
      ) : null}

      <View>{props.children}</View>
    </View>
  );
}
