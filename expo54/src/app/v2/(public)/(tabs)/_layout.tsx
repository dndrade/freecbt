// src/app/v2/(public)/(tabs)/_layout.tsx

import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import React from "react";
import { View } from "react-native";
import { useTranslate } from "@/src/i18n/use-i18n";
import { TAB_CONFIG } from "@/src/constants/tabs-config";

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View className="tabs-icon">
      <View className={focused ? "tabs-pill tabs-active" : "tabs-pill"}>
        <Feather name={name} color={color} size={size} />
      </View>
    </View>
  );
}

export default function Layout() {
  const t = useTranslate();
  const [accent, muted] = useThemeColor(["accent", "muted"]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={tab.icon}
                color={color}
                size={size}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
