import { useDefaultStyle } from "@/src/hooks/use-style";
import React, { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
        <Text style={[s.subheader, s.my2]}>{props.title}</Text>

        <Text style={[s.text, s.my2]}>{props.description}</Text>

        {props.metadata ? (
          <View style={[s.my2]}>{props.metadata}</View>
        ) : null}

        <View style={[s.my2]}>{props.children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
