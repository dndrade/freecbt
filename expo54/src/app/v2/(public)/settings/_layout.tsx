import { Stack } from "expo-router";
import React from "react";

export const unstable_settings = {
  anchor: "index",
};

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
