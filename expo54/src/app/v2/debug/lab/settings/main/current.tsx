import { SettingsScreen } from "@/src/features/settings/settings-screen";
import { LoadModel } from "@/src/hooks/use-model";
import React from "react";

export default function MainSettingsCurrent() {
  return <LoadModel ready={SettingsScreen} />;
}
