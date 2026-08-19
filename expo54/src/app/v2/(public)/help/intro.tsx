import { Routes } from "@/src";
import { OnboardingScreen } from "@/src/features/onboarding/onboarding-screen";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { useRouter } from "expo-router";

export default function Index() {
  return <LoadModel ready={Onboarding} />;
}

function Onboarding(props: ModelLoadedProps) {
  const router = useRouter();

  return (
    <OnboardingScreen
      {...props}
      onSkip={() => {
        props.dispatch(Action.setExistingUser());
        router.push(Routes.homeV2());
      }}
    />
  );
}
