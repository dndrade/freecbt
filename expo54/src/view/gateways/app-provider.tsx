import { useEffect } from "react";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../../i18n/use-i18n";
import { ModelProvider, useModel } from "../../hooks/use-model";
import { Model } from "../../model";
import { AuthGateway } from "@/src/features/lock/auth-gateway";
import { OnboardingGateway } from "./onboarding-gateway"
import { registerDevMenu } from "@/src/debug/register-dev-menu";
import { ThemeSync } from "@/src/theme/theme-sync";

export function ModelI18nProvider(props: { children: React.ReactNode }) {
  const [m] = useModel();
  const locale = Model.locale(m);
  return <I18nProvider locale={locale}>{props.children}</I18nProvider>;
}

export function AppProvider(props: { children: React.ReactNode }) {
  useEffect(() => {
    if (__DEV__) {
      void registerDevMenu();
    }
  }, []);
  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    // 2025/11 - react-native-reanimated-carousel logs some warnings I cannot fix. mute them for now.
    // https://github.com/dohooo/react-native-reanimated-carousel/issues/861
    strict: false,
  });
  return (
    <ModelProvider>
      <ThemeSync />

      <ModelI18nProvider>
        <OnboardingGateway>
          <AuthGateway>
            <SafeAreaProvider>{props.children}</SafeAreaProvider>
          </AuthGateway>
        </OnboardingGateway>
      </ModelI18nProvider>
    </ModelProvider>
  );
}
