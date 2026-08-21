import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { useSettings } from "@/src/features/settings/hooks/useSettings";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Routes } from "../..";

export function OnboardingGateway(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ErrorBoundary
      fallback={props.children}
      onError={(err) => {
        if (__DEV__) {
          console.warn("onboarding gateway failed, letting the user into the app:", err);
        }
      }}
    >
      <OnboardingReady>{props.children}</OnboardingReady>
    </ErrorBoundary>
  );
}

function OnboardingReady(props: { children: React.ReactNode }) {
  const existingUser = useSettings((s) => s.settings?.existingUser ?? false);
  const isHydrated = useSettings((s) => s.isHydrated);
  const initialize = useSettings((s) => s.initialize);
  const pathname = usePathname();
  const isOnboarding = pathname === "/v2/help/intro";
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (isOnboarding) {
      hasRedirected.current = false;
      return;
    }
    if (!existingUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(Routes.introV2());
    }
  }, [existingUser, isHydrated, isOnboarding, router]);

  if (!isHydrated) {
    return null;
  }
  if (existingUser || isOnboarding) {
    return props.children;
  } else {
    // Redirect in progress, show loading or nothing
    return null;
  }
}
