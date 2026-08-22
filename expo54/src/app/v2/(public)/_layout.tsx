import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return <LoadModel ready={Nav} />;
}

function Nav(_: ModelLoadedProps) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="help/index" />
      <Stack.Screen name="help/intro" />
    </Stack>
  );
}
