import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Routes } from "../..";

export function OnboardingGateway(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <LoadModel
      ready={(lprops) => (
        <OnboardingReady {...lprops}>{props.children}</OnboardingReady>
      )}
    />
  );
}
function OnboardingReady(
  props: ModelLoadedProps & { children: React.ReactNode }
) {
  const { model } = props;
  const pathname = usePathname();
  const isOnboarding = pathname === "/v2/help/intro";
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isOnboarding) {
      hasRedirected.current = false;
      return;
    }
    if (!model.settings.existingUser && !isOnboarding && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(Routes.introV2());
    }
  }, [model.settings.existingUser, isOnboarding, router]);

  if (model.settings.existingUser || isOnboarding) {
    return props.children;
  } else {
    // Redirect in progress, show loading or nothing
    return null;
  }
}
