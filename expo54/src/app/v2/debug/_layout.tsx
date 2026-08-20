import { DebugDrawerContent } from "@/src/debug/ui/debug-drawer-content";
import { useDefaultTheme } from "@/src/hooks/use-style";
import { Routes } from "@/src";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";

export default function Layout() {
  if (!__DEV__) {
    return <Redirect href={Routes.homeV2()} />;
  }
  const theme = useDefaultTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        swipeEnabled: true,
        drawerStyle: { width: 240, backgroundColor: theme.backgroundRoot },
        headerStyle: { backgroundColor: theme.backgroundRoot },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
      }}
      drawerContent={(props) => <DebugDrawerContent {...props} />}
    >
      <Drawer.Screen name="lab" options={{ title: "UI/UX Lab" }} />
      <Drawer.Screen name="diagnostics" options={{ title: "Feature Diagnostics" }} />
      <Drawer.Screen name="tools" options={{ title: "Tools" }} />
      <Drawer.Screen name="demos" options={{ title: "Logic Demos" }} />
    </Drawer>
  );
}
