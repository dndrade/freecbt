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
  // one submission at a time: the input stays on screen until we navigate, so an
  // enabled Save button here would let a second tap duplicate the Thought. Both
  // halves are observable model state, so a rejected or failed save can never
  // latch Save shut - there is nothing to un-latch.
  const [awaiting, setAwaiting] = useState<Thought.Id | null>(null);
  const isSaving =
    awaiting !== null ||
    model.thoughtSaveOutbox.some(
      (record) => record.status === "insertion-pending"
    );

  useEffect(() => {
    if (requested.current) {
      // arm only on a submission the model actually accepted
      requested.current = false;
      setAwaiting(
        model.thoughtSaveOutbox.find(
          (record) => record.status === "insertion-pending"
        )?.submissionId ?? null
      );
      return;
    }
    if (awaiting === null) return;
    // the saved Thought reaches `thoughts` only once its write succeeded, so this
    // is the confirmed-persistence signal - never the mere acceptance of a save.
    if (model.thoughts.has(Thought.keyFromId.decode(awaiting))) {
      setAwaiting(null);
      setValue(Thought.emptySpec());
      router.push(Routes.thoughtViewV2(awaiting));
      return;
    }
    // still on its way, or done for: a dropped or failed record stays here with
    // the input intact and Save usable again, recovery surfaced above.
    const record = model.thoughtSaveOutbox.find(
      (candidate) => candidate.submissionId === awaiting
    );
    const inFlight =
      record?.status === "insertion-pending" ||
      record?.status === "pending" ||
      record?.status === "active";
    if (!inFlight) setAwaiting(null);
  }, [awaiting, model.thoughtSaveOutbox, model.thoughts, router]);

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
          // "standalone": this input never came from Home's draft, so a durable
          // save here must not trigger the cleanup that clears that draft
          dispatch(Action.createThought(value, new Date(), "standalone"));
        }}
      />
    </Screen>
  );
}
