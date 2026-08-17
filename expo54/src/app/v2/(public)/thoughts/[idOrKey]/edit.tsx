import { ThoughtEditScreen } from "@/src/features/thoughts/thought-edit-screen";
import { LoadModel } from "@/src/hooks/use-model";

export default function Edit() {
  return <LoadModel ready={ThoughtEditScreen} />;
}
