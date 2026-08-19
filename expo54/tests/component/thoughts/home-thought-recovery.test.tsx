import { Action, DistortionData, Model, Settings, Thought } from "@/src/model";
import type {
  HomeThoughtDraftRecord,
  ThoughtSaveOutboxRecord,
} from "@/src/model/thought-save";
import { act, fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { HomeThoughtRecovery } from "@/src/features/thoughts/home-thought-recovery";
import { renderWithProviders } from "@/tests/support/render";

// Captures the callback passed to expo-router's useFocusEffect so tests can
// simulate a later Home visit without a real navigation container.
let focusCallback: (() => void) | null = null;
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    focusCallback = cb;
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

function refocus() {
  act(() => {
    focusCallback?.();
  });
}

const translate = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key) as unknown as (
  key: string,
  values?: Record<string, unknown>
) => string;

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

function makeOutboxRecord(
  seed: number,
  status: ThoughtSaveOutboxRecord["status"],
  automaticThought = `thought ${seed}`
): ThoughtSaveOutboxRecord {
  const thought = Thought.create(
    { ...Thought.emptySpec(), automaticThought },
    new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
  );
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: seed,
    attemptCount: 1,
    lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 10, seed)),
    lastError: "network unreachable",
    retryRequested: false,
    thoughtPersisted: status === "cleanup-failed",
    updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 20, seed)),
    status,
  };
}

function Harness(props: { model: Model.Ready; dispatch: Action.Dispatch }) {
  return (
    <HomeThoughtRecovery
      model={props.model}
      dispatch={props.dispatch}
      translate={translate}
    />
  );
}

function render(ui: React.ReactElement) {
  return renderWithProviders(ui);
}

beforeEach(() => {
  focusCallback = null;
});

describe("HomeThoughtRecovery", () => {
  test("renders nothing when there is no unresolved outbox state", () => {
    render(<Harness model={emptyReady} dispatch={jest.fn()} />);
    expect(screen.queryByTestId("home-thought-recovery")).toBeNull();
  });

  test("aggregates failed/uncertain recovery and cleanup-failed counts, excluding transient statuses", () => {
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [
        makeOutboxRecord(1, "failed"),
        makeOutboxRecord(2, "uncertain"),
        makeOutboxRecord(3, "cleanup-failed"),
        // in-flight, bounded statuses never count as "needs attention"
        makeOutboxRecord(4, "pending"),
        makeOutboxRecord(5, "insertion-pending"),
        makeOutboxRecord(6, "active"),
      ],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);
    expect(screen.getByTestId("home-thought-recovery")).toBeTruthy();
    expect(
      screen.getByText('cbt_form.recovery_header:{"count":3}')
    ).toBeTruthy();
  });

  test("exposes a short excerpt and a localized timestamp, with the full text reachable via accessibility", () => {
    const record = makeOutboxRecord(1, "failed", "a longer automatic thought");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    const excerpt = screen.getByTestId(
      `home-thought-recovery-excerpt-${record.submissionId}`
    );
    expect(excerpt.props.children).toBe("a longer automatic thought");
    expect(excerpt.props.numberOfLines).toBe(1);
    expect(excerpt.props.accessibilityLabel).toBe(
      "a longer automatic thought"
    );

    expect(
      screen.getByTestId(
        `home-thought-recovery-timestamp-${record.submissionId}`
      ).props.children
    ).toBe(record.updatedAt.toLocaleString());
  });

  test("Retry dispatches the existing retryThoughtSave action for that record only", () => {
    const first = makeOutboxRecord(1, "failed");
    const second = makeOutboxRecord(2, "uncertain");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [first, second],
    };
    const dispatch = jest.fn();
    render(<Harness model={model} dispatch={dispatch} />);

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-retry-${first.submissionId}`)
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      Action.retryThoughtSave(first.submissionId)
    );
  });

  test("D cleanup-failed gets neutral saved copy and is never treated as a new submission", () => {
    const record = makeOutboxRecord(1, "cleanup-failed");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    const dispatch = jest.fn();
    render(<Harness model={model} dispatch={dispatch} />);

    expect(screen.getByText("cbt_form.recovery_cleanup_label")).toBeTruthy();
    expect(
      screen.getByText("cbt_form.recovery_cleanup_description")
    ).toBeTruthy();
    // never rendered as a plain "recovery needed" item
    expect(screen.queryByText("cbt_form.recovery_item_label")).toBeNull();

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-retry-${record.submissionId}`)
    );
    expect(dispatch).toHaveBeenCalledWith(
      Action.retryThoughtSave(record.submissionId)
    );
  });

  test("B draft-clear-failed is subordinate: no second recovery entry, no claim of saved cleanup", () => {
    const record = makeOutboxRecord(1, "failed");
    const draft: HomeThoughtDraftRecord = {
      spec: Thought.emptySpec(),
      sourceRevision: 1,
      updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 0, 0)),
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: 1,
        outboxSubmissionId: record.submissionId,
        lastError: "disk full",
        updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 0, 1)),
      },
    };
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
      homeThoughtDraft: draft,
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    // still one recovery item, not two - B never becomes its own entry
    expect(
      screen.getByText('cbt_form.recovery_header:{"count":1}')
    ).toBeTruthy();
    expect(
      screen.queryAllByTestId(
        `home-thought-recovery-item-${record.submissionId}`
      )
    ).toHaveLength(1);

    const note = screen.getByTestId(
      `home-thought-recovery-note-${record.submissionId}`
    );
    expect(note.props.children).toBe("cbt_form.recovery_draft_cleanup_note");
    // the copy key used here is distinct from D's "saved - cleanup" claim
    expect(note.props.children).not.toBe("cbt_form.recovery_cleanup_label");
  });

  test("an orphaned B note (no matching live record) still surfaces, but never as a counted recovery entry", () => {
    const draft: HomeThoughtDraftRecord = {
      spec: Thought.emptySpec(),
      sourceRevision: 1,
      updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 0, 0)),
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: 1,
        outboxSubmissionId: "no-such-record" as Thought.Id,
        lastError: "disk full",
        updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 0, 1)),
      },
    };
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [],
      homeThoughtDraft: draft,
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    // the failure is never silently swallowed...
    expect(screen.getByTestId("home-thought-recovery")).toBeTruthy();
    expect(
      screen.getByTestId("home-thought-recovery-draft-note").props.children
    ).toBe("cbt_form.recovery_draft_cleanup_note");
    // ...but it is never a counted "needs attention" recovery item either
    expect(
      screen.queryByText(/cbt_form.recovery_header/)
    ).toBeNull();
    expect(screen.queryByText("cbt_form.recovery_item_label")).toBeNull();
  });

  test("falls back to a localized placeholder for an empty Automatic Thought, never an internal ID", () => {
    const record = makeOutboxRecord(1, "failed", "");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    const excerpt = screen.getByTestId(
      `home-thought-recovery-excerpt-${record.submissionId}`
    );
    expect(excerpt.props.children).toBe("cbt_form.recovery_untitled");
    expect(excerpt.props.accessibilityLabel).toBe(
      "cbt_form.recovery_untitled"
    );
    expect(excerpt.props.children).not.toBe(record.submissionId);
  });

  test("Retry is disabled for every record while any one record already has a queued retry", () => {
    const queued = { ...makeOutboxRecord(1, "failed"), retryRequested: true };
    const other = makeOutboxRecord(2, "uncertain");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [queued, other],
    };
    const dispatch = jest.fn();
    render(<Harness model={model} dispatch={dispatch} />);

    const queuedRetry = screen.getByTestId(
      `home-thought-recovery-retry-${queued.submissionId}`
    );
    const otherRetry = screen.getByTestId(
      `home-thought-recovery-retry-${other.submissionId}`
    );
    expect(queuedRetry.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    // the model rejects any new retry request while one is already queued -
    // every button must reflect that, not just the one that requested it
    expect(otherRetry.props.accessibilityState).toMatchObject({
      disabled: true,
    });

    fireEvent.press(otherRetry);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Discard on a failed/uncertain record confirms with lossy copy, then dispatches discardThoughtSave", () => {
    const record = makeOutboxRecord(1, "failed");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    const dispatch = jest.fn();
    render(<Harness model={model} dispatch={dispatch} />);

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-discard-${record.submissionId}`)
    );
    expect(
      screen.getByTestId(
        `home-thought-recovery-discard-confirm-${record.submissionId}`
      )
    ).toBeTruthy();
    expect(
      screen.getByText("cbt_form.recovery_discard_confirm_lossy")
    ).toBeTruthy();
    // never the safe/neutral D copy for a record that was never confirmed saved
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_safe")
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(
        `home-thought-recovery-discard-confirm-yes-${record.submissionId}`
      )
    );
    expect(dispatch).toHaveBeenCalledWith(
      Action.discardThoughtSave(record.submissionId)
    );
  });

  test("Discard on a cleanup-failed record confirms with safe copy, and Cancel dispatches nothing", () => {
    const record = makeOutboxRecord(1, "cleanup-failed");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    const dispatch = jest.fn();
    render(<Harness model={model} dispatch={dispatch} />);

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-discard-${record.submissionId}`)
    );
    expect(
      screen.getByText("cbt_form.recovery_discard_confirm_safe")
    ).toBeTruthy();
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_lossy")
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(
        `home-thought-recovery-discard-cancel-${record.submissionId}`
      )
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(
        `home-thought-recovery-discard-confirm-${record.submissionId}`
      )
    ).toBeNull();
  });

  test("Discard on an uncertain-but-already-persisted record uses the safe copy, never the false 'never saved' claim", () => {
    // the crash-between-persisted-flag-and-removal case: `Model.ready`'s
    // restart normalization can leave `status: "uncertain"` with
    // `thoughtPersisted: true` when the write landed but the outbox removal
    // never got the chance to run before the app died
    const record = {
      ...makeOutboxRecord(1, "uncertain"),
      thoughtPersisted: true,
    };
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-discard-${record.submissionId}`)
    );
    expect(
      screen.getByText("cbt_form.recovery_discard_confirm_safe")
    ).toBeTruthy();
    // this Thought IS saved - never claim it was never saved / cannot be
    // recovered, and never the softer-but-still-uncertain wording either
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_lossy")
    ).toBeNull();
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_uncertain")
    ).toBeNull();
  });

  test("Discard on an uncertain, not-yet-confirmed-persisted record is honest about the uncertainty", () => {
    const record = {
      ...makeOutboxRecord(1, "uncertain"),
      thoughtPersisted: false,
    };
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(`home-thought-recovery-discard-${record.submissionId}`)
    );
    expect(
      screen.getByText("cbt_form.recovery_discard_confirm_uncertain")
    ).toBeTruthy();
    // it's genuinely unknown, not confirmed lost - never assert either outcome
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_lossy")
    ).toBeNull();
    expect(
      screen.queryByText("cbt_form.recovery_discard_confirm_safe")
    ).toBeNull();
  });

  test("a record in an ineligible (in-flight) status has no recovery item, so no Discard control at all", () => {
    const record = makeOutboxRecord(1, "pending");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    expect(
      screen.queryByTestId(`home-thought-recovery-item-${record.submissionId}`)
    ).toBeNull();
    expect(
      screen.queryByTestId(
        `home-thought-recovery-discard-${record.submissionId}`
      )
    ).toBeNull();
  });

  test("dismissing hides the banner for this visit, and a later Home visit rediscovers it", () => {
    const record = makeOutboxRecord(1, "failed");
    const model: Model.Ready = {
      ...emptyReady,
      thoughtSaveOutbox: [record],
    };
    render(<Harness model={model} dispatch={jest.fn()} />);

    expect(screen.getByTestId("home-thought-recovery")).toBeTruthy();
    fireEvent.press(screen.getByTestId("home-thought-recovery-dismiss"));
    expect(screen.queryByTestId("home-thought-recovery")).toBeNull();

    // still unresolved, but this is a new visit
    refocus();
    expect(screen.getByTestId("home-thought-recovery")).toBeTruthy();
  });
});
