import { Stack } from "expo-router";
import React from "react";

export default function DiagnosticsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Feature Diagnostics" }} />
      <Stack.Screen
        name="backup/index"
        options={{ title: "Backup" }}
      />
      <Stack.Screen
        name="backup/recovery-key-workflow"
        options={{ title: "Recovery Key Workflow" }}
      />
      <Stack.Screen
        name="backup/backup-implementation"
        options={{ title: "Backup implementation" }}
      />
      <Stack.Screen
        name="backup/archive-crypto-diagnostics"
        options={{ title: "Archive-v3 diagnostics" }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{ title: "Notifications" }}
      />
    </Stack>
  );
}
