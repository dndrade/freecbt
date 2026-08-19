import { Stack } from "expo-router";
import React from "react";

export const unstable_settings = {
  anchor: "index",
};

export default function SettingsLabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
