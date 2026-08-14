import { LoadModel } from "@/src/hooks/use-model";
import { PinUpdateScreen } from "@/src/features/lock/pin-update-screen";
import React from "react";

export default function Lock(): React.JSX.Element {
  return <LoadModel ready={PinUpdateScreen} />;
}
