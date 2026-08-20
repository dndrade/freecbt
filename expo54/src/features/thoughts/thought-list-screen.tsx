import { Routes } from "@/src";
import { Screen } from "@/src/components";
import { TopBar } from "@/src/components/layout/top-bar";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Model, Thought } from "@/src/model";
import { Feather } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { cn, Typography, useThemeColor } from "heroui-native";
import React from "react";
import { SectionList, TouchableOpacity, View } from "react-native";

export function ThoughtListScreen(props: ModelLoadedProps) {
  const { model, dispatch, translate: t } = props;
  const { idOrKey } = useLocalSearchParams<{ idOrKey?: string }>();
  const selectedId = selectedThoughtId(idOrKey);
  const list = Model.thoughtsByDate(model);
  const today = new Date().toDateString();
  const sections = list.map(([date, thoughts]) => ({
    title: today === date ? t("cbt_list.today") : date,
    data: thoughts,
  }));

  return (
    <Screen scroll={false} contentClassName="flex-1">
      <TopBar title={t("settings.journal.header")} />
      {sections.length === 0 ? (
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
          renderItem={({ item }) => (
            <ThoughtRow
              model={model}
              dispatch={dispatch}
              translate={t}
              thought={item}
              selected={selectedId === item.uuid}
            />
          )}
        />
      )}
    </Screen>
  );
}

function selectedThoughtId(idOrKey: string | undefined) {
  const parsed = Thought.Thought.shape.uuid.safeParse(idOrKey);
  return parsed.success ? parsed.data : null;
}

function ThoughtRow(
  props: Pick<ModelLoadedProps, "model" | "dispatch" | "translate"> & {
    thought: Thought.Thought;
    selected: boolean;
  }
) {
  const { model, thought, dispatch, translate: t, selected } = props;
  const accent = useThemeColor("accent");
  const onDelete = () => dispatch(Action.deleteThought(thought.uuid));
  const label = Thought.label(thought, model);
  const emojis = Thought.emojis(thought);

  return (
    <View className="flex-row items-center justify-between gap-2">
      <Link href={Routes.thoughtViewV2(thought.uuid)} asChild>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={emojis ? `${label} ${emojis}` : label}
          accessibilityState={{ selected }}
          className={cn(
            "flex-1 flex-col gap-1 rounded-lg border border-border bg-surface-secondary p-3 shadow-sm",
            selected && "border-accent bg-surface-tertiary"
          )}
          style={selected ? { borderColor: accent, borderWidth: 2 } : undefined}
        >
          <Typography type="body" selectable>
            {label}
          </Typography>
          {emojis ? (
            <Typography type="body" className="self-start rounded-md bg-surface-tertiary px-2 py-1">
              {emojis}
            </Typography>
          ) : null}
        </TouchableOpacity>
      </Link>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("accessibility.delete_thought_button")}
        onPress={onDelete}
        className="self-start rounded-lg border border-border bg-surface-secondary p-3"
      >
        <Feather name="trash" size={18} />
      </TouchableOpacity>
    </View>
  );
}
