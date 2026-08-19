import { debugNavItems } from "@/src/debug/navigation";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { homeV2 } from "@/src/routes";
import {
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useRouter, usePathname, type Href } from "expo-router";
import React from "react";
import { Text } from "react-native";

function isActive(pathname: string, href: Href): boolean {
  const target = href as string;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function DebugDrawerContent(props: DrawerContentComponentProps) {
  const s = useDefaultStyle();
  const router = useRouter();
  const pathname = usePathname();

  function go(href: Href) {
    router.navigate(href);
    props.navigation.closeDrawer();
  }

  return (
    <DrawerContentScrollView {...props}>
      <Text style={[s.subheader, s.my2, s.p3]}>FreeCBT Debug</Text>

      {debugNavItems.map((item) => {
        const focused = isActive(pathname, item.href);

        return (
          <DrawerItem
            key={item.href as string}
            label={({ focused }) => (
              <Text style={[s.text]}>
                {focused ? "✓ " : ""}
                {item.title}
              </Text>
            )}
            accessibilityLabel={item.title}
            focused={focused}
            onPress={() => go(item.href)}
          />
        );
      })}

      <DrawerItem
        label="Return to FreeCBT"
        accessibilityLabel="Return to FreeCBT"
        style={[s.border, { marginTop: 16 }]}
        onPress={() => go(homeV2())}
      />
    </DrawerContentScrollView>
  );
}
