import { Routes } from "@/src";
import { Screen } from "@/src/components/screen";
import { ThoughtEntryForm, ThoughtSaveRecovery } from "@/src/components/thought-entry";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Thought } from "@/src/model";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

export default function Create() {
  return <LoadModel ready={Ready} />;
}

/**
 * The compatibility create screen: a full-screen entry context for deep links and
 * older navigation. Its unfinished input is session-local - it never reads or
 * writes Home's durable draft - and it only navigates to the saved Thought once
 * that Thought is confirmed persisted.
 */
function Ready({ model, dispatch, translate: t }: ModelLoadedProps) {
  const [value, setValue] = useState(Thought.emptySpec());
  const router = useRouter();
  const requested = useRef(false);
  const awaiting = useRef<Thought.Id | null>(null);
  // one submission at a time: the input stays on screen until we navigate, so an
  // enabled Save button here would let a second tap duplicate the Thought.
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    if (requested.current) {
      // arm only on a submission the model actually accepted
      requested.current = false;
      awaiting.current =
        model.thoughtSaveOutbox.find(
          (record) => record.status === "insertion-pending"
        )?.submissionId ?? null;
      if (awaiting.current === null) setSaving(false);
    }
    const id = awaiting.current;
    if (id === null) return;
    if (
      model.thoughtSaveResult !== "idle" &&
      model.thoughtSaveResult.submissionId === id
    ) {
      // the save failed: stay here with the input intact, recovery surfaced above
      awaiting.current = null;
      setSaving(false);
      return;
    }
    // the saved Thought reaches `thoughts` only once its write succeeded, so this
    // is the confirmed-persistence signal - never the mere acceptance of a save.
    if (!model.thoughts.has(Thought.keyFromId.decode(id))) return;
    awaiting.current = null;
    setSaving(false);
    setValue(Thought.emptySpec());
    router.push(Routes.thoughtViewV2(id));
  }, [
    model.thoughtSaveOutbox,
    model.thoughtSaveResult,
    model.thoughts,
    router,
  ]);

  return (
    <Screen scroll={false} contentClassName="flex-1 gap-3">
      <ThoughtSaveRecovery model={model} />
      <ThoughtEntryForm
        route="compatibility"
        translate={t}
        distortions={model.distortionData.list}
        value={value}
        isSaving={isSaving}
        onChange={setValue}
        onSave={() => {
          requested.current = true;
          setSaving(true);
          dispatch(Action.createThought(value, new Date()));
        }}
      />
    </Screen>
  );
}
