import { LoadModel } from "@/src/hooks/use-model";
import { SettingsScreen } from "@/src/features/settings/settings-screen";

export default function Index() {
  return <LoadModel ready={SettingsScreen} />;
}
