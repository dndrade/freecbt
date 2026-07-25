import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { useRouter, useGlobalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Routes } from "..";

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
  const { model, dispatch } = props;
  const { onboarded } = useGlobalSearchParams();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // set existingUser now, at redirect-decision time — do not wait for
  // `onboarded` to round-trip back through a completed navigation, since
  // that round-trip is not guaranteed to ever land here (see
  // .dev/audits/audit-log-010-onboarding-redirect-loop.md).
  useEffect(() => {
    if (!model.settings.existingUser && !onboarded && !hasRedirected.current) {
      hasRedirected.current = true;
      dispatch(Action.setExistingUser());
      router.push(Routes.introV2({ onboarded: true }));
    }
  }, [model.settings.existingUser, onboarded, dispatch, router]);

  if (model.settings.existingUser || onboarded) {
    return props.children;
  } else {
    // Redirect in progress, show loading or nothing
    return null;
  }
}
