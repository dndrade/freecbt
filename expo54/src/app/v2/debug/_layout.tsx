import { Routes } from "@/src";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { Redirect } from "expo-router";
import Drawer from "expo-router/drawer";
import { useAppColors } from "@/src/components";
import { DrawerNavigationOptions } from "@react-navigation/drawer";
import React from "react";

export default function Layout() {
  const s = useDefaultStyle();
  const colors = useAppColors();
  const drawerOptions: DrawerNavigationOptions = {
    headerStyle: { backgroundColor: colors.background, borderBottomColor: s.border.borderColor },
    headerTintColor: colors.foreground,
    drawerStyle: { backgroundColor: colors.background },
    drawerLabelStyle: { color: colors.foreground },
    drawerInactiveTintColor: colors.foreground,
  };
  if (!__DEV__) {
    return <Redirect href={Routes.homeV2()} />;
  }
  return (
    <Drawer screenOptions={drawerOptions}>
      <Drawer.Screen name="index" options={{ title: "Debug tools" }} />
    </Drawer>
  );
}
