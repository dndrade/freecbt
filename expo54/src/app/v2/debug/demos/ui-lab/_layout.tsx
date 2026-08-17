import { Stack } from "expo-router";
import React from "react";

export default function UiLabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "UI/UX Lab" }} />
      <Stack.Screen name="onboarding/index" options={{ title: "Onboarding" }} />
    </Stack>
  );
}
