import { useThemeColor } from "heroui-native";
import { Stack } from "expo-router";
import React from "react";

export default function Layout() {
  return <Nav />;
}

function Nav() {
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
        headerTitleStyle: { color: foreground, fontWeight: "600" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="help/index" />
      <Stack.Screen name="help/intro" />
    </Stack>
  );
}
