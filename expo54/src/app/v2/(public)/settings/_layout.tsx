import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import React from "react";

export const unstable_settings = {
  anchor: "index",
};

export default function SettingsLayout() {
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
    />
  );
}
