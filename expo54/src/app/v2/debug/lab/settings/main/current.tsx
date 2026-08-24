import React from "react";
import { SettingsScreen } from "@/features/settings/screens/SettingsScreen";
import { LoadModel } from "@/hooks/use-model";

export default function CurrentSettings() {
  return <LoadModel ready={SettingsScreen as any} />;
}
