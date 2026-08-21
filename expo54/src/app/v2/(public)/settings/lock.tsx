import { PinUpdateScreen } from "@/features/lock/pin-update-screen";
import { LoadModel } from "@/hooks/use-model";

export default function Lock() {
  return <LoadModel ready={PinUpdateScreen} />;
}