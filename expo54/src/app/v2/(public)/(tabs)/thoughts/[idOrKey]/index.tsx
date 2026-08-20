import { ThoughtViewScreen } from "@/src/features/thoughts/thought-view-screen";
import { LoadModel } from "@/src/hooks/use-model";

export default function Show() {
  return <LoadModel ready={ThoughtViewScreen} />;
}
