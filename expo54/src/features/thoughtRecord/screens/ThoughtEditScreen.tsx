import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { DistortionData, Thought } from "@/model";
import { StandardScreen, backHeaderAction } from "@/shared/components";
import { useThoughtEntryForm } from "@/features/thoughts/thought-entry-form";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService, type ThoughtsService } from "../services/thoughtsService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import React from "react";
import { ActivityIndicator, View } from "react-native";

type LoadedThought = {
  thought: Thought.Thought;
  service: ThoughtsService;
};

export function ThoughtEditScreen() {
  const t = useTranslate();
  const router = useRouter();
  const params = useLocalSearchParams<{ idOrKey?: string; slide?: string }>();
  const parsedId = Thought.Id.safeParse(params.idOrKey);
  const id = parsedId.success ? parsedId.data : null;
  const parsedSlide = Thought.SlideName.safeParse(params.slide);
  const slide = parsedSlide.success ? parsedSlide.data : undefined;
  const [retryKey, setRetryKey] = React.useState(0);
  const [loaded, setLoaded] = React.useState<LoadedThought | null>(null);
  const [loadError, setLoadError] = React.useState<Error | null>(null);
  const [value, setValue] = React.useState(Thought.emptySpec);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const saving = React.useRef(false);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    let current = true;
    setLoaded(null);
    setLoadError(null);
    setSaveError(null);
    if (id === null) {
      setLoadError(new Error("invalid thought ID"));
      return () => {
        current = false;
      };
    }
    void (async () => {
      try {
        const db = await ensureThoughtRecordReady();
        if (!current) return;
        const service = thoughtsService(DistortionData, db);
        const thought = await service.read(id);
        if (!current) return;
        setValue(Thought.toSpec(thought));
        setLoaded({ thought, service });
      } catch (error) {
        if (current) {
          setLoadError(error instanceof Error ? error : new Error("could not load thought"));
        }
      }
    })();
    return () => {
      current = false;
    };
  }, [id, retryKey]);

  const save = React.useCallback(async () => {
    if (loaded === null || saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const thought: Thought.Thought = {
        ...value,
        uuid: loaded.thought.uuid,
        createdAt: loaded.thought.createdAt,
        updatedAt: new Date(),
      };
      await loaded.service.write(thought);
      if (mounted.current) router.replace(Routes.thoughtViewV2(thought.uuid));
    } catch {
      if (mounted.current) setSaveError(t("cbt_form.thought_save_failed"));
    } finally {
      saving.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }, [loaded, router, t, value]);

  const { body, actions } = useThoughtEntryForm({
    route: "compatibility",
    resetKey: `${id ?? "invalid"}:${slide ?? "automatic-thought"}`,
    translate: t,
    distortions: DistortionData.list,
    value,
    slide,
    onChange: setValue,
    onSave: save,
    onRetry: save,
    isSaving,
    saveError,
  });

  return (
    <StandardScreen
      title={t("cbt_form.edit")}
      leftAction={backHeaderAction(() => router.back())}
      scrollable={false}
      contentClassName="flex-1 gap-3"
      footer={loaded === null ? undefined : actions}
    >
      {loadError !== null ? (
        <View testID="thought-edit-error" accessibilityRole="alert" className="gap-2">
          <Typography type="body-sm">{t("cbt_form.thought_load_failed")}</Typography>
          <Button testID="thought-edit-retry" variant="secondary" onPress={() => setRetryKey((key) => key + 1)}>
            {t("cbt_form.retry")}
          </Button>
        </View>
      ) : loaded === null ? (
        <ActivityIndicator testID="thought-edit-loading" />
      ) : (
        body
      )}
    </StandardScreen>
  );
}
