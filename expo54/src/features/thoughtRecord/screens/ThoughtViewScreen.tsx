import { DistortionData, Thought } from "@/model";
import { useTranslate } from "@/i18n/use-i18n";
import { StandardScreen, backHeaderAction } from "@/shared/components";
import { ThoughtFieldCards } from "@/features/thoughts/thought-view-screen";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService } from "../services/thoughtsService";

export function ThoughtViewScreen() {
  const t = useTranslate();
  const router = useRouter();
  const { idOrKey } = useLocalSearchParams<{ idOrKey?: string }>();
  const parsedId = Thought.Id.safeParse(idOrKey);
  const id = parsedId.success ? parsedId.data : null;
  const [retryKey, setRetryKey] = React.useState(0);
  const [thought, setThought] = React.useState<Thought.Thought | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let current = true;
    setThought(null);
    setError(null);
    if (id === null) {
      setError(new Error("invalid thought ID"));
      return () => {
        current = false;
      };
    }
    void (async () => {
      try {
        const db = await ensureThoughtRecordReady();
        if (!current) return;
        const thought = await thoughtsService(DistortionData, db).read(id);
        if (current) setThought(thought);
      } catch (error) {
        if (current) setError(error instanceof Error ? error : new Error("could not load thought"));
      }
    })();
    return () => {
      current = false;
    };
  }, [id, retryKey]);

  return (
    <StandardScreen title={t("cbt_view.header")} leftAction={backHeaderAction(() => router.back())} contentClassName="flex-1 gap-4">
      {error !== null ? (
        <View testID="thought-view-error" accessibilityRole="alert" className="gap-2">
          <Typography type="body-sm">{t("cbt_form.thought_load_failed")}</Typography>
          <Button testID="thought-view-retry" variant="secondary" onPress={() => setRetryKey((key) => key + 1)}>
            {t("cbt_form.retry")}
          </Button>
        </View>
      ) : thought === null ? (
        <ActivityIndicator testID="thought-view-loading" />
      ) : (
        <ThoughtFieldCards thought={thought} distortions={DistortionData.list} translate={t} />
      )}
    </StandardScreen>
  );
}
