import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { Thought } from "@/model";
import { StandardScreen } from "@/shared/components";
import { Link, useLocalSearchParams } from "expo-router";
import { Button, Typography, cn, useThemeColor } from "heroui-native";
import React from "react";
import { ActivityIndicator, SectionList, TouchableOpacity, View } from "react-native";
import { useThoughtHistory } from "../hooks/useThoughtHistory";

export type ThoughtHistory = ReturnType<typeof useThoughtHistory>;

export function ThoughtListScreen({ history }: { history: ThoughtHistory }) {
  return <ThoughtList history={history} />;
}

export function ThoughtListRoute() {
  return <ThoughtList history={useThoughtHistory()} />;
}

function ThoughtList({ history }: { history: ThoughtHistory }) {
  const t = useTranslate();
  const { idOrKey } = useLocalSearchParams<{ idOrKey?: string }>();
  const selectedId = Thought.Id.safeParse(idOrKey).data ?? null;
  const sections = thoughtSections(history.thoughts, t("cbt_list.today"));

  return (
    <StandardScreen title={t("settings.journal.header")} scrollable={false} contentClassName="flex-1">
      {history.isLoading ? (
        <ActivityIndicator testID="thought-list-loading" />
      ) : history.error !== null ? (
        <View testID="thought-list-error" accessibilityRole="alert" className="gap-2">
          <Typography type="body-sm">{t("cbt_form.thought_load_failed")}</Typography>
          <Button testID="thought-list-retry" variant="secondary" onPress={() => void history.refresh()}>
            {t("cbt_form.retry")}
          </Button>
        </View>
      ) : sections.length === 0 ? (
        <Typography type="body">{t("cbt_list.empty")}</Typography>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(thought) => thought.uuid}
          contentContainerClassName="gap-2"
          renderSectionHeader={({ section }) => (
            <Typography.Heading type="h4" className="mt-4 mb-2">
              {section.title}
            </Typography.Heading>
          )}
          renderItem={({ item }) => <ThoughtRow thought={item} selected={selectedId === item.uuid} />}
        />
      )}
    </StandardScreen>
  );
}

function thoughtSections(thoughts: readonly Thought.Thought[], today: string) {
  const grouped = new Map<string, Thought.Thought[]>();
  for (const thought of [...thoughts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const date = thought.createdAt.toDateString();
    grouped.set(date, [...(grouped.get(date) ?? []), thought]);
  }
  return Array.from(grouped, ([date, data]) => ({ title: new Date().toDateString() === date ? today : date, data }));
}

function ThoughtRow({ thought, selected }: { thought: Thought.Thought; selected: boolean }) {
  const accent = useThemeColor("accent");
  const label = thought.automaticThought || thought.alternativeThought || "🤷‍";
  const emojis = Thought.emojis(thought);

  return (
    <Link href={Routes.thoughtViewV2(thought.uuid)} asChild>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={emojis ? `${label} ${emojis}` : label}
        accessibilityState={{ selected }}
        className={cn("flex-col gap-1 rounded-lg border border-border bg-surface-secondary p-3 shadow-sm", selected && "border-accent bg-surface-tertiary")}
        style={selected ? { borderColor: accent, borderWidth: 2 } : undefined}
      >
        <Typography type="body" selectable>{label}</Typography>
        {emojis ? <Typography type="body" className="self-start rounded-md bg-surface-tertiary px-2 py-1">{emojis}</Typography> : null}
      </TouchableOpacity>
    </Link>
  );
}
