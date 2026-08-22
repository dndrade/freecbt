// src/app/v2/(public)/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import React from "react";
import { useTranslate } from "@/src/i18n/use-i18n";
import { TAB_CONFIG } from "@/src/constants/tabs-config";
import { MainTabBar } from "@/shared/components/navigation/main-tab-bar";

export default function Layout() {
  const t = useTranslate();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <MainTabBar {...props} />}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: t(tab.labelKey) }}
        />
      ))}
    </Tabs>
  );
}
