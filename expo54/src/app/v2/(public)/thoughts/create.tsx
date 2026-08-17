import { CompatibilityCreateScreen } from "@/src/features/thoughts/compatibility-create-screen";
import { LoadModel } from "@/src/hooks/use-model";

export default function Create() {
  return <LoadModel ready={CompatibilityCreateScreen} />;
}
