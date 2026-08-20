import { useDefaultStyle } from "@/src/hooks/use-style";
import React, { ReactNode } from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";

export interface DebugSectionProps {
  title?: string;
  children: ReactNode;
}

export function DebugSection(props: DebugSectionProps) {
  const s = useDefaultStyle();

  return (
    <View style={[s.my2]}>
      {props.title ? (
        <Typography type="h4" className="my-2">{props.title}</Typography>
      ) : null}

      <View>{props.children}</View>
    </View>
  );
}
