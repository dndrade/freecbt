import { Routes } from "@/src";
import { Redirect, Stack } from "expo-router";
import React from "react";

export default function Layout() {
  if (!__DEV__) {
    return <Redirect href={Routes.homeV2()} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
