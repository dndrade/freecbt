import { useTranslate } from "@/i18n/use-i18n";
import { AdaptiveThoughtsLayout } from "@/features/thoughts/adaptive-thoughts-layout";
import { Slot, useFocusEffect, useLocalSearchParams } from "expo-router";
import React from "react";
import { useThoughtHistory } from "../hooks/useThoughtHistory";
import { ThoughtListScreen } from "./ThoughtListScreen";

export function ThoughtsLayout() {
  const t = useTranslate();
  const { idOrKey } = useLocalSearchParams<{ idOrKey?: string }>();
  const history = useThoughtHistory();
  const refresh = history.refresh;
  const focused = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (focused.current) void refresh();
      focused.current = true;
    }, [refresh])
  );

  return (
    <AdaptiveThoughtsLayout
      list={<ThoughtListScreen history={history} />}
      detail={<Slot />}
      selectedId={typeof idOrKey === "string" ? idOrKey : null}
      hasThoughts={history.thoughts.length > 0}
      selectThoughtText={t("cbt_list.select_thought")}
    />
  );
}
