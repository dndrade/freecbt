import { Stack } from "expo-router";
import React from "react";

export default function BackupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Backup" }} />
      <Stack.Screen
        name="recovery-key-workflow"
        options={{ title: "Recovery Key Workflow" }}
      />
      <Stack.Screen
        name="backup-implementation"
        options={{ title: "Backup implementation" }}
      />
      <Stack.Screen
        name="archive-crypto-diagnostics"
        options={{ title: "Archive-v3 diagnostics" }}
      />
    </Stack>
  );
}
