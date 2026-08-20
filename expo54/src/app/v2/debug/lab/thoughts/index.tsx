import { LoadModel } from "@/src/hooks/use-model";
import { ThoughtListScreen } from "@/src/features/thoughts/thought-list-screen";
import React from "react";

export default function LabThoughtsIndex() {
  return <LoadModel ready={ThoughtListScreen} />;
}
