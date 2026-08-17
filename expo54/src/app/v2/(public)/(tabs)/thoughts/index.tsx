import { ThoughtListScreen } from "@/src/features/thoughts/thought-list-screen";
import { LoadModel } from "@/src/hooks/use-model";

export default function Index() {
  return <LoadModel ready={ThoughtListScreen} />;
}
