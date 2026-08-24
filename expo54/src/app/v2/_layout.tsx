import "../../../global.css";
import { AppProvider } from "@/src/view/gateways/app-provider";
import { runSettingsBootstrap } from "@/src/features/settings/hooks/settingsBootstrap";
import { Slot } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
          <AppProvider>
            <Slot />
          </AppProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
