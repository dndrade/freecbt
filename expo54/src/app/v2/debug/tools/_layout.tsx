import { Stack } from "expo-router";
import React from "react";

export default function ToolsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Tools" }} />
      <Stack.Screen name="debug" options={{ title: "Debug Inspector" }} />
      <Stack.Screen name="theme-probe" options={{ title: "Theme Probe" }} />
      <Stack.Screen
        name="asyncstorage-dump"
        options={{ title: "AsyncStorage Dump" }}
      />
    </Stack>
  );
}
