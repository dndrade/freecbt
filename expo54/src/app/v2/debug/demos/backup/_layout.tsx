import { Stack } from "expo-router";
import React from "react";

export default function BackupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ title: "Backup tools" }}
      />
      <Stack.Screen
        name="backup-implementation"
        options={{ title: "Backup implementation" }}
      />
      <Stack.Screen
        name="recovery-key-workflow"
        options={{ title: "Recovery-key workflow" }}
      />
      <Stack.Screen
        name="archive-crypto-diagnostics"
        options={{ title: "Archive-v3 crypto" }}
      />
    </Stack>
  );
}
