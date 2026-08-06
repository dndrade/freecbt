import { Routes } from "@/src";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { Redirect } from "expo-router";
import Drawer from "expo-router/drawer";
import React from "react";
import { useDrawerOptions } from "../(public)/_layout";

export default function Layout() {
  const s = useDefaultStyle();
  const drawerOptions = useDrawerOptions(s);
  if (!__DEV__) {
    return <Redirect href={Routes.homeV2()} />;
  }
  return (
    <Drawer screenOptions={drawerOptions}>
      <Drawer.Screen name="index" options={{ title: "developer debug page" }} />
      <Drawer.Screen
        name="tools/encrypted-backup"
        options={{ title: "encrypted backup diagnostics" }}
      />
      <Drawer.Screen
        name="demos/backup/index"
        options={{ title: "backup feature flag demo" }}
      />
    </Drawer>
  );
}
