import { HomeComposerScreen } from "@/src/features/thoughts/home-composer-screen";
import { LoadModel } from "@/src/hooks/use-model";

export default function Index() {
  return <LoadModel ready={HomeComposerScreen} />;
}
