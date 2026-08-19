import { AdaptiveThoughtsLayout } from "@/src/features/thoughts/adaptive-thoughts-layout";
import { ThoughtListScreen } from "@/src/features/thoughts/thought-list-screen";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Slot, useLocalSearchParams } from "expo-router";
import React from "react";

export default function Layout() {
  return <LoadModel ready={ThoughtsLayout} />;
}

function ThoughtsLayout(props: ModelLoadedProps) {
  const { idOrKey } = useLocalSearchParams<{ idOrKey?: string }>();
  const selectedId = typeof idOrKey === "string" ? idOrKey : null;

  return (
    <AdaptiveThoughtsLayout
      list={<ThoughtListScreen {...props} />}
      detail={<Slot />}
      selectedId={selectedId}
    />
  );
}
