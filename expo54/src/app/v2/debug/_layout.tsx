import { Routes } from "@/src";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { Redirect } from "expo-router";
import Drawer from "expo-router/drawer";
import { useAppColors } from "@/src/components";
import React from "react";
import { useDrawerOptions } from "../(public)/_layout";

export default function Layout() {
  const s = useDefaultStyle();
  const colors = useAppColors();
  const drawerOptions = useDrawerOptions(s, colors);
  if (!__DEV__) {
    return <Redirect href={Routes.homeV2()} />;
  }
  return (
    <Drawer screenOptions={drawerOptions}>
      <Drawer.Screen name="index" options={{ title: "Debug tools" }} />
    </Drawer>
  );
}
