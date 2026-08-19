import { Screen, ScreenHeader } from "@/src/components";
import { ThoughtEntryForm } from "./thought-entry-form";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Thought } from "@/src/model";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { useThoughtFromParams } from "./use-thought-from-route";

export function ThoughtEditScreen({ model, dispatch, translate: t }: ModelLoadedProps) {
  const res = useThoughtFromParams(model);
  const params = useLocalSearchParams<{ slide?: string }>();
  const slide = Thought.SlideName.safeParse(params.slide);
  const [value, setValue] = useState<Thought.Spec>(
    res.status === "success" ? res.value : Thought.emptySpec()
  );
  if (res.status === "error") return res.error;
  return (
    <Screen scroll={false} contentClassName="flex-1">
      <ScreenHeader title={t("cbt_form.edit")} />
      <ThoughtEntryForm
        route="compatibility"
        translate={t}
        distortions={model.distortionData.list}
        value={value!}
        slide={slide.data ?? undefined}
        onChange={setValue}
        onSave={() =>
          dispatch(
            Action.updateThought({
              ...res.value,
              // strip extra fields, just in case they somehow end up here
              ...Thought.Spec.decode(value),
            })
          )
        }
      />
    </Screen>
  );
}
