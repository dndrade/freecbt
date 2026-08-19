import { PinUpdateScreen } from "@/src/features/lock/pin-update-screen";
import { LoadModel } from "@/src/hooks/use-model";
import React from "react";

export default function PinSetupCurrent() {
  return <LoadModel ready={PinUpdateScreen} />;
}
