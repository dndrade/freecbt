import { Stack } from "expo-router";
import React from "react";

export default function DiagnosticsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Feature Diagnostics" }} />
      <Stack.Screen
        name="notifications/index"
        options={{ title: "Notifications" }}
      />
    </Stack>
  );
}
