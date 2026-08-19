import { Routes } from "@/src";
import { Screen, ScreenHeader } from "@/src/components";
import { HomeThoughtRecovery } from "./home-thought-recovery";
import { ThoughtEntryForm } from "./thought-entry-form";
import type { ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Thought } from "@/src/model";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

/**
 * The compatibility create screen: a full-screen entry context for deep links and
 * older navigation. Its unfinished input is session-local - it never reads or
 * writes Home's durable draft - and it only navigates to the saved Thought once
 * that Thought is confirmed persisted.
 */
export function CompatibilityCreateScreen({ model, dispatch, translate: t }: ModelLoadedProps) {
  const [value, setValue] = useState(Thought.emptySpec());
  const router = useRouter();
  // the submission this screen started, by id: every screen shares one model,
  // so "whatever is insertion-pending" can belong to another screen entirely
  const requested = useRef<Thought.Id | null>(null);
  const [submitted, setSubmitted] = useState<Thought.Id | null>(null);
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
  // a rejection this screen caused: the text stays put and says why
  const rejected =
    model.thoughtSaveResult !== "idle" &&
    model.thoughtSaveResult.submissionId === submitted
      ? model.thoughtSaveResult
      : null;

  useEffect(() => {
    const id = requested.current;
    if (id !== null) {
      requested.current = null;
      // arm only on this screen's own submission, once the model accepted it
      if (
        model.thoughtSaveOutbox.some(
          (record) =>
            record.submissionId === id && record.status === "insertion-pending"
        )
      ) {
        setAwaiting(id);
        return;
      }
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
  }, [
    awaiting,
    model.thoughtSaveOutbox,
    model.thoughtSaveResult,
    model.thoughts,
    router,
  ]);

  return (
    <Screen scroll={false} contentClassName="flex-1 gap-3">
      <ScreenHeader title={t("cbt_form.new")} />
      {/* the same recovery surface Home uses, so Retry here goes through the
          model's own retry instead of a fresh save that duplicates the Thought */}
      <HomeThoughtRecovery
        route="compatibility"
        model={model}
        dispatch={dispatch}
        translate={t}
      />
      <ThoughtEntryForm
        route="compatibility"
        translate={t}
        distortions={model.distortionData.list}
        value={value}
        isSaving={isSaving}
        saveError={
          rejected === null
            ? null
            : t(
                rejected.stage === "capacity"
                  ? "cbt_form.thought_save_capacity"
                  : "cbt_form.thought_save_failed"
              )
        }
        onChange={setValue}
        onSave={() => {
          // "standalone": this input never came from Home's draft, so a durable
          // save here must not trigger the cleanup that clears that draft
          const action = Action.createThought(
            value,
            new Date(),
            "standalone"
          );
          requested.current = action.submissionId;
          setSubmitted(action.submissionId);
          dispatch(action);
        }}
      />
    </Screen>
  );
}
