import "../../../global.css";
import { AppProvider } from "@/src/view/gateways/app-provider";
import { runSettingsBootstrap } from "@/src/features/settings/hooks/settingsBootstrap";
import { Slot } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { PortalHost } from "heroui-native";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OVERFLOW_MENU_PORTAL_HOST } from "@/shared/components/OverflowMenu/OverflowMenuTrigger";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        await runSettingsBootstrap();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    })().catch(() => {});
  }, []);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider
          config={{ devInfo: { stylingPrinciples: false } }}
        >
          {/* Dedicated host for the overflow menu, kept out of HeroUI's
              built-in PortalHost: that host lives inside a second, nested
              SafeAreaProvider (heroui-native's SafeAreaListener) whose
              flattened children toggle null on mount/unmount, which crashes
              Android's dispatchGetDisplayList. This host must stay inside
              HeroUINativeProvider so portaled content (e.g. Menu.ItemTitle)
              still has its text/layout context, but as a stable sibling of
              the app content instead of a togglable direct child of that
              inner SafeAreaProvider. */}
          <View style={{ flex: 1 }} collapsable={false}>
            <AppProvider>
              <Slot />
            </AppProvider>
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
              collapsable={false}
            >
              <PortalHost name={OVERFLOW_MENU_PORTAL_HOST} />
            </View>
          </View>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
