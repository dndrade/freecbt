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


// import { Feather } from "@expo/vector-icons";
// import { Tabs } from "expo-router";
// import { useThemeColor } from "heroui-native";
// import React from "react";
// import { View } from "react-native";
// import { useTranslate } from "@/src/i18n/use-i18n";
//
// function TabIcon({
//   name,
//   color,
//   size,
//   focused,
// }: {
//   name: React.ComponentProps<typeof Feather>["name"];
//   color: string;
//   size: number;
//   focused: boolean;
// }) {
//   return (
//     <View className={focused ? "rounded-full bg-accent p-1" : "p-1"}>
//       <Feather name={name} color={color} size={size} />
//     </View>
//   );
// }
//
// export default function Layout() {
//   const t = useTranslate();
//   const [accent, muted] = useThemeColor(["accent", "muted"]);
//
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: accent,
//         tabBarInactiveTintColor: muted,
//       }}
//     >
//       <Tabs.Screen
//         name="thoughts/index"
//         options={{
//           title: t("settings.hub.journal.label"),
//           tabBarIcon: ({ color, size, focused }) => (
//             <TabIcon name="book-open" color={color} size={size} focused={focused} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color, size, focused }) => (
//             <TabIcon name="home" color={color} size={size} focused={focused} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="settings/index"
//         options={{
//           title: t("accessibility.settings_button"),
//           tabBarIcon: ({ color, size, focused }) => (
//             <TabIcon name="settings" color={color} size={size} focused={focused} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }
