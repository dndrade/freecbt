import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { DistortionData, Thought } from "@/model";
import { StandardScreen, backHeaderAction } from "@/shared/components";
import { useThoughtEntryForm } from "@/features/thoughts/thought-entry-form";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService } from "../services/thoughtsService";
import { useRouter } from "expo-router";
import React from "react";

export function ThoughtCreateScreen() {
  const t = useTranslate();
  const router = useRouter();
  const [value, setValue] = React.useState(Thought.emptySpec);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const saving = React.useRef(false);

  const save = React.useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const db = await ensureThoughtRecordReady();
      const thought = Thought.create(value, new Date());
      await thoughtsService(DistortionData, db).write(thought);
      router.replace(Routes.thoughtViewV2(thought.uuid));
    } catch {
      setSaveError(t("cbt_form.thought_save_failed"));
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }, [router, t, value]);

  const { body, actions } = useThoughtEntryForm({
    route: "compatibility",
    translate: t,
    distortions: DistortionData.list,
    value,
    onChange: setValue,
    onSave: save,
    onRetry: save,
    isSaving,
    saveError,
  });

  return (
    <StandardScreen
      title={t("cbt_form.new")}
      leftAction={backHeaderAction(() => router.back())}
      scrollable={false}
      contentClassName="flex-1 gap-3"
      footer={actions}
    >
      {body}
    </StandardScreen>
  );
}
