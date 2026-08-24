import { useDefaultStyle } from "@/src/hooks/use-style";
import React, { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography } from "heroui-native";

export interface DebugScreenProps {
  title: string;
  description: string;
  children: ReactNode;
  metadata?: ReactNode;
}

export function DebugScreen(props: DebugScreenProps) {
  const s = useDefaultStyle();

  return (
    <SafeAreaView style={[s.view]}>
      <ScrollView
        contentContainerStyle={[s.container, s.p4]}
        keyboardShouldPersistTaps="handled"
      >
        <Typography type="h3" className="my-2">{props.title}</Typography>

        <Typography type="body-sm" className="my-2">{props.description}</Typography>

        {props.metadata ? (
          <View style={[s.my2]}>{props.metadata}</View>
        ) : null}

        <View style={[s.my2]}>{props.children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
