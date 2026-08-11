import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { Action, Model, Thought } from "@/src/model";

const DEBOUNCE_MS = 500;

export interface HomeThoughtDraft {
  spec: Thought.Spec;
  /** A field edit: debounced, so typing doesn't write on every keystroke. */
  change: (spec: Thought.Spec) => void;
  /** Submit the current spec ("A"): the durable outbox insertion. */
  submit: () => void;
  discarding: boolean;
  discard: () => void;
  cancelDiscard: () => void;
  confirmDiscard: () => void;
}

/**
 * Home's thought-entry draft lifecycle: debounced durable writes, flushes at the
 * boundaries where we'd otherwise lose them (pause, route exit, app background),
 * restore-on-mount, reset once the submission is durable, and explicit discard.
 *
 * Deliberately owns no presentation and no step index - the step is ephemeral and
 * never persisted, so a remount restores the draft text without touching the step.
 */
export function useHomeThoughtDraft(props: {
  model: Model.Ready;
  dispatch: Action.Dispatch;
  /** The visible input was just emptied - by a durable save, or by a discard. */
  onReset?: () => void;
}): HomeThoughtDraft {
  const { model, dispatch } = props;
  const [spec, setSpec] = useState<Thought.Spec>(
    () => Model.restorableHomeThoughtDraft(model) ?? Thought.emptySpec()
  );
  const [discarding, setDiscarding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Thought.Spec | null>(null);
  const requested = useRef(false);
  const armed = useRef<Thought.Id | null>(null);

  const cancelDebounce = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const flush = useCallback(() => {
    const next = pending.current;
    cancelDebounce();
    if (next !== null) {
      dispatch(Action.updateHomeThoughtDraft(next, new Date()));
    } else if (model.homeThoughtDraftPersistence !== "idle") {
      // nothing new to write, but the last durable write failed: retry it here
      dispatch(Action.flushHomeThoughtDraft());
    }
  }, [cancelDebounce, dispatch, model.homeThoughtDraftPersistence]);

  // subscribe once, but always flush with the newest state
  const flushRef = useRef(flush);
  const onResetRef = useRef(props.onReset);
  useEffect(() => {
    flushRef.current = flush;
    onResetRef.current = props.onReset;
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      // never starts Retry and never moves focus/tab/UI state - only persists
      if (state === "background" || state === "inactive") flushRef.current();
    });
    return () => sub.remove();
  }, []);

  // route exit
  useEffect(() => () => flushRef.current(), []);

  // "A" resolved: Home resets on durable insertion alone, never waiting on "B"
  // (the revision-guarded draft cleanup the model runs from the same action).
  useEffect(() => {
    if (requested.current && armed.current === null) {
      // arm only on a submit the model actually accepted. A rejected one - empty
      // spec, outbox at capacity, insertion already in flight - changes nothing,
      // so it must never leave a watcher behind to wipe later typing.
      requested.current = false;
      armed.current =
        model.thoughtSaveOutbox.find((r) => r.status === "insertion-pending")
          ?.submissionId ?? null;
      return;
    }
    // a redundant submit while one is already in flight changes nothing: the
    // submission we armed on is still the one that governs the reset.
    requested.current = false;
    const id = armed.current;
    if (id === null) return;
    const record = model.thoughtSaveOutbox.find((r) => r.submissionId === id);
    if (record?.status === "insertion-pending") return;
    armed.current = null;
    // a rejected insertion keeps the user's text on screen instead
    if (
      model.thoughtSaveResult !== "idle" &&
      model.thoughtSaveResult.submissionId === id
    ) {
      return;
    }
    cancelDebounce();
    setSpec(Thought.emptySpec());
    onResetRef.current?.();
  }, [cancelDebounce, model.thoughtSaveOutbox, model.thoughtSaveResult]);

  const change = useCallback((next: Thought.Spec) => {
    setSpec(next);
    pending.current = next;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), DEBOUNCE_MS);
  }, []);

  const submit = useCallback(() => {
    cancelDebounce();
    requested.current = true;
    dispatch(Action.createThought(spec, new Date(), "home"));
  }, [cancelDebounce, dispatch, spec]);

  const confirmDiscard = useCallback(() => {
    cancelDebounce();
    setSpec(Thought.emptySpec());
    setDiscarding(false);
    onResetRef.current?.();
    // draft-only: never touches in-flight or completed outbox submissions
    dispatch(Action.clearHomeThoughtDraft());
  }, [cancelDebounce, dispatch]);

  return {
    spec,
    change,
    submit,
    discarding,
    discard: useCallback(() => setDiscarding(true), []),
    cancelDiscard: useCallback(() => setDiscarding(false), []),
    confirmDiscard,
  };
}
