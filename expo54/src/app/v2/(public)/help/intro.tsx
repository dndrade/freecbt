import { Routes } from "@/src";
import { OnboardingScreen } from "@/src/features/onboarding";
import { useRouter } from "expo-router";

export default function Intro() {
  const router = useRouter();
  const finishOnboarding = () => router.replace(Routes.homeV2());

  return (
    <OnboardingScreen onSkip={finishOnboarding} onComplete={finishOnboarding} />
  );
}
