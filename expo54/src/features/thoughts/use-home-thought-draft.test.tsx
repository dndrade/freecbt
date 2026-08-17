/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { Action, DistortionData, Model, Settings, Thought } from "../../model";
import type { ThoughtSaveOutboxRecord } from "../../model/thought-save";
import { useHomeThoughtDraft } from "./use-home-thought-draft";

const emptyReady: Model.Ready = {
  status: "ready",
  thoughts: new Map(),
  thoughtParseErrors: new Map(),
  deviceColorScheme: null,
  deviceLocale: "en",
  distortionData: DistortionData,
  sessionAuthed: false,
  settings: Settings.empty(),
  onboardingCompletion: "idle",
  homeThoughtDraft: null,
  homeThoughtDraftRevision: 0,
  homeThoughtDraftPersistence: "idle",
  thoughtSaveOutbox: [],
  thoughtSaveResult: "idle",
};

function spec(automaticThought: string): Thought.Spec {
  return { ...Thought.emptySpec(), automaticThought };
}

function outboxRecord(
  seed: number,
  status: ThoughtSaveOutboxRecord["status"],
  submissionId?: Thought.Id
): ThoughtSaveOutboxRecord {
  const created = Thought.create(
    spec(`unrelated ${seed}`),
    new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
  );
  const thought =
    submissionId === undefined ? created : { ...created, uuid: submissionId };
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: seed,
    attemptCount: 0,
    lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 0, seed)),
    lastError: null,
    retryRequested: false,
    thoughtPersisted: false,
    updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 0, seed)),
    status,
  };
}

function renderDraft(
  initial: Model.Ready = emptyReady,
  props: Partial<Parameters<typeof useHomeThoughtDraft>[0]> = {}
) {
  const dispatch = jest.fn();
  const hook = renderHook(
    (model: Model.Ready) => useHomeThoughtDraft({ model, dispatch, ...props }),
    { initialProps: initial }
  );
  /** The submission id of the last Save this hook actually dispatched. */
  const submissionId = (): Thought.Id => {
    const calls = dispatch.mock.calls.filter(
      ([a]) => a.action === "create-thought"
    );
    return calls[calls.length - 1][0].submissionId;
  };
  return { ...hook, dispatch, submissionId };
}

test("a rejected Save never arms the reset watcher", () => {
  // an outbox at capacity makes createThought a no-op: nothing is submitted
  const full: Model.Ready = {
    ...emptyReady,
    thoughtSaveOutbox: Array.from({ length: 20 }, (_, i) =>
      outboxRecord(i + 1, "pending")
    ),
  };
  const { result, rerender, dispatch } = renderDraft(full);

  act(() => result.current.change(spec("typed before save")));
  act(() => result.current.submit());
  expect(dispatch).toHaveBeenCalled();

  act(() => result.current.change(spec("typed after the rejected save")));

  // an unrelated outbox mutation later: it must not wipe what the user typed
  rerender({
    ...full,
    thoughtSaveOutbox: full.thoughtSaveOutbox.slice(1),
  });

  expect(result.current.spec.automaticThought).toBe(
    "typed after the rejected save"
  );
});

test("resets only after the submission it armed becomes durable", () => {
  const { result, rerender, submissionId } = renderDraft();

  act(() => result.current.change(spec("save me")));
  act(() => result.current.submit());

  const accepted = {
    ...outboxRecord(30, "insertion-pending", submissionId()),
    sourceDraftRevision: 1,
  };
  rerender({ ...emptyReady, thoughtSaveOutbox: [accepted] });
  expect(result.current.spec.automaticThought).toBe("save me");

  rerender({
    ...emptyReady,
    thoughtSaveOutbox: [{ ...accepted, status: "pending" }],
  });
  expect(result.current.spec.automaticThought).toBe("");
});

test("still resets when a redundant Save lands while the first is in flight", () => {
  const { result, rerender, submissionId } = renderDraft();

  act(() => result.current.change(spec("save me")));
  act(() => result.current.submit());

  const accepted = {
    ...outboxRecord(32, "insertion-pending", submissionId()),
    sourceDraftRevision: 1,
  };
  rerender({ ...emptyReady, thoughtSaveOutbox: [accepted] });

  // Save has no disabled guard yet, so a second tap is reachable. The model
  // rejects it while an insertion is pending, leaving the model untouched.
  act(() => result.current.submit());

  rerender({
    ...emptyReady,
    thoughtSaveOutbox: [{ ...accepted, status: "pending" }],
  });

  expect(result.current.spec.automaticThought).toBe("");
});

test("keeps the text on screen when the durable insertion is rejected", () => {
  const { result, rerender, submissionId } = renderDraft();

  act(() => result.current.change(spec("save me")));
  act(() => result.current.submit());

  const accepted = outboxRecord(31, "insertion-pending", submissionId());
  rerender({ ...emptyReady, thoughtSaveOutbox: [accepted] });
  rerender({
    ...emptyReady,
    thoughtSaveOutbox: [],
    thoughtSaveResult: {
      status: "failure",
      submissionId: accepted.submissionId,
      stage: "outbox-insert",
      error: new Error("disk full"),
    },
  });

  expect(result.current.spec.automaticThought).toBe("save me");
});

test("another screen's submission never resets Home's draft", () => {
  // Home stays mounted under the pushed create screen and shares one model, so
  // a rejected Save here must never leave a watcher that arms on someone else's
  // submission - resetting on it would drop text nobody ever saved.
  const full: Model.Ready = {
    ...emptyReady,
    thoughtSaveOutbox: Array.from({ length: 20 }, (_, i) =>
      outboxRecord(i + 1, "pending")
    ),
  };
  const onReset = jest.fn();
  const { result, rerender } = renderDraft(full, { onReset });

  act(() => result.current.change(spec("mine, unsaved")));
  act(() => result.current.submit());

  // the other screen's save is accepted...
  const foreign = outboxRecord(99, "insertion-pending");
  rerender({ ...full, thoughtSaveOutbox: [...full.thoughtSaveOutbox, foreign] });
  // ...and resolves
  rerender({
    ...full,
    thoughtSaveOutbox: [
      ...full.thoughtSaveOutbox,
      { ...foreign, status: "pending" as const },
    ],
  });

  expect(result.current.spec.automaticThought).toBe("mine, unsaved");
  expect(onReset).not.toHaveBeenCalled();
});

test("reports a capacity rejection instead of failing silently", () => {
  const full: Model.Ready = {
    ...emptyReady,
    thoughtSaveOutbox: Array.from({ length: 20 }, (_, i) =>
      outboxRecord(i + 1, "pending")
    ),
  };
  const onFailure = jest.fn();
  const { result, rerender, submissionId } = renderDraft(full, { onFailure });

  act(() => result.current.change(spec("no room for this")));
  act(() => result.current.submit());

  const result2 = Model.update(
    full,
    // the real reducer decides: this is the rejection the model produces
    Action.createThought(
      spec("no room for this"),
      new Date(),
      "home",
      submissionId()
    )
  )[0] as Model.Ready;
  rerender(result2);

  expect(onFailure).toHaveBeenCalledWith(
    expect.objectContaining({ stage: "capacity" })
  );
  // the editable input is untouched by the rejection
  expect(result.current.spec.automaticThought).toBe("no room for this");
});

test("does not re-present a draft that was already accepted into the outbox", () => {
  const draft = {
    spec: spec("already submitted"),
    sourceRevision: 4,
    updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 0)),
    draftCleanup: null,
  };
  const { result } = renderDraft(
    Model.ready({
      ...emptyReady,
      homeThoughtDraft: draft,
      thoughtSaveOutbox: [
        { ...outboxRecord(40, "pending"), sourceDraftRevision: 4 },
      ],
    })
  );

  expect(result.current.spec.automaticThought).toBe("");
});
