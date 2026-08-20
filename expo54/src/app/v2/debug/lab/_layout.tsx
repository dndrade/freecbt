import { Stack } from "expo-router";
import React from "react";

export default function LabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "UI/UX Lab" }} />
      <Stack.Screen name="onboarding/index" options={{ title: "Onboarding" }} />
      <Stack.Screen name="thoughts/index" options={{ title: "Thoughts" }} />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
    </Stack>
  );
}
