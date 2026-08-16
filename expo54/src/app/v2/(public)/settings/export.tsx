import { LoadModel } from "@/src/hooks/use-model";
import { ExportScreen } from "@/src/features/export/export-screen";
import React from "react";

export default function Export(): React.JSX.Element {
  return <LoadModel ready={ExportScreen} />;
}
