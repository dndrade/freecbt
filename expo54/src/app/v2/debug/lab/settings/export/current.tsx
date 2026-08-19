import { ExportScreen } from "@/src/features/export/export-screen";
import { LoadModel } from "@/src/hooks/use-model";
import React from "react";

export default function ExportCurrent() {
  return <LoadModel ready={ExportScreen} />;
}
