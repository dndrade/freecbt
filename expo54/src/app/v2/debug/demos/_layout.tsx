import { Stack } from "expo-router";
import React from "react";

export default function DemosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Logic Demos" }} />
      <Stack.Screen name="counter" options={{ title: "Counter" }} />
      <Stack.Screen name="promise" options={{ title: "Promise" }} />
    </Stack>
  );
}
