import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { DistortionData, Thought } from "@/model";
import { StandardScreen } from "@/shared/components";
import { Feather } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { Button, Typography, cn, useThemeColor } from "heroui-native";
import React from "react";
import { ActivityIndicator, SectionList, TouchableOpacity, View } from "react-native";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService } from "../services/thoughtsService";

export type ThoughtHistory = {
  thoughts: readonly Thought.Thought[];
  isLoading: boolean;
  error: Error | null;
  refresh(): Promise<void>;
};

export function ThoughtListScreen({ history }: { history: ThoughtHistory }) {
  return <ThoughtList history={history} />;
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
          renderItem={({ item }) => <ThoughtRow history={history} thought={item} selected={selectedId === item.uuid} deleteLabel={t("accessibility.delete_thought_button")} />}
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

function ThoughtRow({ deleteLabel, history, thought, selected }: { deleteLabel: string; history: ThoughtHistory; thought: Thought.Thought; selected: boolean }) {
  const accent = useThemeColor("accent");
  const [confirming, setConfirming] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeError, setRemoveError] = React.useState(false);
  const label = thought.automaticThought || thought.alternativeThought || "🤷‍";
  const emojis = Thought.emojis(thought);

  async function remove() {
    setIsRemoving(true);
    setRemoveError(false);
    try {
      await thoughtsService(DistortionData, await ensureThoughtRecordReady()).remove(thought.uuid);
      setConfirming(false);
      await history.refresh();
    } catch {
      setRemoveError(true);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Link href={Routes.thoughtViewV2(thought.uuid)} asChild>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={emojis ? `${label} ${emojis}` : label}
            accessibilityState={{ selected }}
            className={cn("flex-1 flex-col gap-1 rounded-lg border border-border bg-surface-secondary p-3 shadow-sm", selected && "border-accent bg-surface-tertiary")}
            style={selected ? { borderColor: accent, borderWidth: 2 } : undefined}
          >
            <Typography type="body" selectable>{label}</Typography>
            {emojis ? <Typography type="body" className="self-start rounded-md bg-surface-tertiary px-2 py-1">{emojis}</Typography> : null}
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          onPress={() => { setConfirming(true); setRemoveError(false); }}
          className="min-h-12 min-w-12 items-center justify-center self-start rounded-lg border border-border bg-surface-secondary p-3"
        >
          <Feather name="trash" size={18} />
        </TouchableOpacity>
      </View>
      {confirming ? (
        <View testID={`thought-delete-confirmation-${thought.uuid}`} accessibilityRole="alert" className="gap-2 rounded-lg border border-border bg-surface-secondary p-3">
          <Typography type="body-sm">{removeError ? "Couldn't delete this thought." : "Delete this thought? This cannot be undone."}</Typography>
          <View className="flex-row gap-3">
            <Button
              testID={`${removeError ? "thought-delete-retry" : "thought-delete-confirm"}-${thought.uuid}`}
              className="flex-1"
              isDisabled={isRemoving}
              onPress={() => void remove()}
            >
              {removeError ? "Retry" : "Delete"}
            </Button>
            <Button
              testID={`thought-delete-cancel-${thought.uuid}`}
              variant="secondary"
              className="flex-1"
              isDisabled={isRemoving}
              onPress={() => { setConfirming(false); setRemoveError(false); }}
            >
              Cancel
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
