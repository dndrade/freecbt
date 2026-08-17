import { LoadModel } from "@/src/hooks/use-model";
import { OnboardingScreen } from "@/src/features/onboarding/onboarding-screen";

export default function Index() {
  return <LoadModel ready={OnboardingScreen} />;
}
