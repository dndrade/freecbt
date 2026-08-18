import { Action, Cmd, DistortionData, Model, Settings, Thought } from "@/src/model";
import type {
  HomeThoughtDraftRecord,
  ThoughtSaveOutboxRecord,
} from "@/src/model/thought-save";

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

function sampleSpec(overrides: Partial<Thought.Spec> = {}): Thought.Spec {
  return {
    ...Thought.emptySpec(),
    automaticThought: "I always mess this up",
    ...overrides,
  };
}

function makeOutboxRecord(
  seed: number,
  status: ThoughtSaveOutboxRecord["status"] = "pending"
): ThoughtSaveOutboxRecord {
  const thought = Thought.create(
    sampleSpec({ automaticThought: `thought ${seed}` }),
    new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
  );
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: seed,
    attemptCount: 0,
    lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 10, seed)),
    lastError: null,
    retryRequested: false,
    thoughtPersisted: false,
    updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 20, seed)),
    status,
  };
}

test("basic actions", () => {
  let m: Model.Model;
  const ready = () => {
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  [m] = Model.init;
  expect(m).toEqual(Model.loading);
  [m] = Model.update(m, Action.modelReady(emptyReady));
  expect(m.status).toBe("ready");
  expect(ready().thoughts.size).toBe(0);
  expect(ready().thoughtSaveOutbox).toEqual([]);
  expect(ready().settings.theme).toBe(null);
  [m] = Model.update(m, Action.createThought(Thought.emptySpec(), new Date(0)));
  expect(ready().thoughts.size).toBe(0);
  expect(ready().thoughtSaveOutbox).toEqual([]);
  [m] = Model.update(m, Action.setTheme("dark"));
  expect(ready().settings.theme).toBe("dark");
});

test("ready normalizes an interrupted active outbox record without changing its metadata", () => {
  const active = makeOutboxRecord(1, "active");
  const draft: HomeThoughtDraftRecord = {
    spec: sampleSpec(),
    sourceRevision: 7,
    updatedAt: new Date("2026-08-11T00:00:00.000Z"),
    draftCleanup: {
      status: "clear-failed",
      sourceRevision: 6,
      outboxSubmissionId: active.submissionId,
      lastError: "draft clear failed",
      updatedAt: new Date("2026-08-11T00:00:01.000Z"),
    },
  };

  const hydrated = Model.ready({
    ...emptyReady,
    homeThoughtDraft: draft,
    thoughtSaveOutbox: [active],
  });

  expect(hydrated.homeThoughtDraft).toEqual(draft);
  expect(hydrated.homeThoughtDraftRevision).toBe(7);
  expect(hydrated.thoughtSaveOutbox).toEqual([
    { ...active, status: "uncertain" },
  ]);
});

test("seeds the draft revision past every stuck outbox record", () => {
  const stuck: ThoughtSaveOutboxRecord = {
    ...makeOutboxRecord(1, "failed"),
    sourceDraftRevision: 5,
  };
  const standalone: ThoughtSaveOutboxRecord = {
    ...makeOutboxRecord(2, "failed"),
    sourceDraftRevision: Model.NO_HOME_DRAFT_REVISION,
  };

  // a restart with no draft used to restart the counter at 0, so the next
  // draft could be handed revision 5 all over again
  const hydrated = Model.ready({
    ...emptyReady,
    homeThoughtDraft: null,
    thoughtSaveOutbox: [stuck, standalone],
  });
  expect(hydrated.homeThoughtDraftRevision).toBe(5);

  const [typed] = Model.update(
    hydrated,
    Action.updateHomeThoughtDraft(
      sampleSpec({ automaticThought: "typed after the restart" }),
      new Date("2026-08-11T12:00:00.000Z")
    )
  );
  const draft = (typed as Model.Ready).homeThoughtDraft!;
  expect(draft.sourceRevision).toBe(6);

  // and the next restart restores it: no false collision with the stuck record
  const restarted = Model.ready({
    ...emptyReady,
    homeThoughtDraft: draft,
    thoughtSaveOutbox: [stuck, standalone],
  });
  expect(Model.restorableHomeThoughtDraft(restarted)).toEqual(draft.spec);
});

test("import archive merges thoughts without deleting local-only thoughts", () => {
    const localThought = Thought.create(Thought.emptySpec(), new Date(0));
    const importedThought = Thought.create(Thought.emptySpec(), new Date(1));

    const existing: Model.Ready = {
        ...emptyReady,
        thoughts: new Map([[Thought.key(localThought), localThought]]),
    };

    const [updated, cmds] = Model.update(
        existing,
        Action.importArchive({ thoughts: [importedThought] })
    );

    expect(updated.status).toBe("ready");

    const ready = updated as Model.Ready;

    expect(ready.thoughts.get(Thought.key(localThought))).toEqual(localThought);
    expect(ready.thoughts.get(Thought.key(importedThought))).toEqual(
        importedThought
    );

    expect(cmds.some((cmd) => cmd.cmd === "delete-thought")).toBe(false);
});

test("onboarding completion persists only after a successful result", () => {
  const error = new Error("settings write failed");
  let m: Model.Model = emptyReady;

  const [saving, savingCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  m = saving;
  expect((m as Model.Ready).onboardingCompletion).toBe("saving");
  expect((m as Model.Ready).settings.existingUser).toBe(false);
  expect(savingCmds).toEqual([
    Cmd.completeOnboarding({ ...emptyReady.settings, existingUser: true }),
  ]);

  const [duplicate, duplicateCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  expect(duplicate).toBe(m);
  expect(duplicateCmds).toEqual([]);

  [m] = Model.update(m, Action.onboardingCompletionSucceeded());
  expect((m as Model.Ready).onboardingCompletion).toBe("idle");
  expect((m as Model.Ready).settings.existingUser).toBe(true);

  [m] = Model.update(
    emptyReady,
    Action.beginOnboardingCompletion()
  );
  [m] = Model.update(m, Action.onboardingCompletionFailed(error));
  expect((m as Model.Ready).onboardingCompletion).toEqual({
    status: "failure",
    error,
  });
  expect((m as Model.Ready).settings.existingUser).toBe(false);

  const [retry, retryCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  expect((retry as Model.Ready).onboardingCompletion).toBe("saving");
  expect(retryCmds).toHaveLength(1);
});

test("tracks one meaningful home draft and clears empty drafts", () => {
  const now = new Date("2026-08-11T01:00:00.000Z");
  const draftSpec = sampleSpec();

  const [withDraft, draftCmds] = Model.update(
    emptyReady,
    Action.updateHomeThoughtDraft(draftSpec, now)
  );

  expect((withDraft as Model.Ready).homeThoughtDraft).toEqual({
    spec: draftSpec,
    sourceRevision: 1,
    updatedAt: now,
    draftCleanup: null,
  } satisfies HomeThoughtDraftRecord);
  expect(draftCmds).toEqual([
    Cmd.writeHomeThoughtDraft({
      spec: draftSpec,
      sourceRevision: 1,
      updatedAt: now,
      draftCleanup: null,
    }),
  ]);

  const [cleared, clearCmds] = Model.update(
    withDraft,
    Action.updateHomeThoughtDraft(Thought.emptySpec(), new Date("2026-08-11T01:01:00.000Z"))
  );

  expect((cleared as Model.Ready).homeThoughtDraft).toBeNull();
  expect((cleared as Model.Ready).homeThoughtDraftRevision).toBe(2);
  expect(clearCmds).toEqual([Cmd.clearHomeThoughtDraft()]);
});

describe("home draft A→B handoff", () => {
  const draftAt = new Date("2026-08-11T11:00:00.000Z");
  const submitAt = new Date("2026-08-11T11:00:01.000Z");
  const insertedAt = new Date("2026-08-11T11:00:02.000Z");

  function submitted(spec: Thought.Spec) {
    let m: Model.Model = emptyReady;
    [m] = Model.update(m, Action.updateHomeThoughtDraft(spec, draftAt));
    const draft = (m as Model.Ready).homeThoughtDraft as HomeThoughtDraftRecord;
    [m] = Model.update(m, Action.createThought(spec, submitAt));
    const record = (m as Model.Ready).thoughtSaveOutbox[0];
    return { m, draft, record };
  }

  test("clears a matching Home draft only after durable insertion succeeds", () => {
    const { m, draft, record } = submitted(sampleSpec({ automaticThought: "handoff" }));
    expect(record.sourceDraftRevision).toBe(draft.sourceRevision);
    expect((m as Model.Ready).homeThoughtDraft).toEqual(draft);

    const [cleared, cmds] = Model.update(
      m,
      Action.thoughtSaveOutboxInsertionSucceeded(record.submissionId, insertedAt)
    );

    expect((cleared as Model.Ready).homeThoughtDraft).toBeNull();
    expect(cmds).toContainEqual(
      Cmd.clearHomeThoughtDraft({
        record: draft,
        outboxSubmissionId: record.submissionId,
      })
    );
    // the accepted submission is never cancelled, duplicated, or claimed saved
    expect((cleared as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
    expect((cleared as Model.Ready).thoughtSaveOutbox[0].submissionId).toBe(
      record.submissionId
    );
    expect((cleared as Model.Ready).thoughts.size).toBe(0);
  });

  test("never clears a newer Home draft revision", () => {
    const { m, record } = submitted(sampleSpec({ automaticThought: "handoff" }));
    const [typedMore] = Model.update(
      m,
      Action.updateHomeThoughtDraft(
        sampleSpec({ automaticThought: "handoff, plus more" }),
        new Date("2026-08-11T11:00:01.500Z")
      )
    );
    const newer = (typedMore as Model.Ready).homeThoughtDraft;

    const [skipped, cmds] = Model.update(
      typedMore,
      Action.thoughtSaveOutboxInsertionSucceeded(record.submissionId, insertedAt)
    );

    expect((skipped as Model.Ready).homeThoughtDraft).toEqual(newer);
    expect(cmds.some((cmd) => cmd.cmd === "clear-home-thought-draft")).toBe(false);
    expect((skipped as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
  });

  test("records clear-failed cleanup metadata without touching the accepted submission", () => {
    const { m, draft, record } = submitted(sampleSpec({ automaticThought: "handoff" }));
    const [cleared] = Model.update(
      m,
      Action.thoughtSaveOutboxInsertionSucceeded(record.submissionId, insertedAt)
    );

    const [failed, cmds] = Model.update(
      cleared,
      Action.homeThoughtDraftCleanupFailed(
        draft,
        record.submissionId,
        new Error("disk full"),
        new Date("2026-08-11T11:00:03.000Z")
      )
    );

    const expected: HomeThoughtDraftRecord = {
      ...draft,
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: draft.sourceRevision,
        outboxSubmissionId: record.submissionId,
        lastError: "disk full",
        updatedAt: new Date("2026-08-11T11:00:03.000Z"),
      },
    };
    expect((failed as Model.Ready).homeThoughtDraft).toEqual(expected);
    expect(cmds).toEqual([Cmd.writeHomeThoughtDraft(expected)]);
    expect((failed as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
    expect((failed as Model.Ready).thoughtSaveOutbox[0].submissionId).toBe(
      record.submissionId
    );
    expect((failed as Model.Ready).thoughts.size).toBe(0);
  });

  test("keeps newer draft content when recording a failed cleanup", () => {
    const { m, draft, record } = submitted(sampleSpec({ automaticThought: "handoff" }));
    const [cleared] = Model.update(
      m,
      Action.thoughtSaveOutboxInsertionSucceeded(record.submissionId, insertedAt)
    );
    const [typedMore] = Model.update(
      cleared,
      Action.updateHomeThoughtDraft(
        sampleSpec({ automaticThought: "a brand new thought" }),
        new Date("2026-08-11T11:00:03.000Z")
      )
    );
    const newer = (typedMore as Model.Ready).homeThoughtDraft as HomeThoughtDraftRecord;

    const [failed, cmds] = Model.update(
      typedMore,
      Action.homeThoughtDraftCleanupFailed(
        draft,
        record.submissionId,
        new Error("disk full"),
        new Date("2026-08-11T11:00:04.000Z")
      )
    );

    expect((failed as Model.Ready).homeThoughtDraft?.spec).toEqual(newer.spec);
    expect((failed as Model.Ready).homeThoughtDraft?.draftCleanup).toEqual({
      status: "clear-failed",
      sourceRevision: draft.sourceRevision,
      outboxSubmissionId: record.submissionId,
      lastError: "disk full",
      updatedAt: new Date("2026-08-11T11:00:04.000Z"),
    });
    expect(cmds).toHaveLength(1);
  });

  test("restores a Home draft when a crash interrupts before durable insertion", () => {
    const draft: HomeThoughtDraftRecord = {
      spec: sampleSpec({ automaticThought: "lost before A" }),
      sourceRevision: 9,
      updatedAt: draftAt,
      draftCleanup: null,
    };

    const hydrated = Model.ready({ ...emptyReady, homeThoughtDraft: draft });
    expect(hydrated.homeThoughtDraft).toEqual(draft);
    expect(hydrated.homeThoughtDraftRevision).toBe(9);
    expect(Model.update(Model.loading, Action.modelReady(hydrated))[1]).toEqual([]);

    const [resubmitted] = Model.update(
      hydrated,
      Action.createThought(draft.spec, submitAt)
    );
    expect((resubmitted as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
    expect((resubmitted as Model.Ready).thoughtSaveOutbox[0].sourceDraftRevision).toBe(9);
  });

  test("keeps an A-succeeded, B-interrupted handoff reconcilable across a restart", () => {
    // the realistic on-disk state after a crash between the durable insert and
    // the status flip B rides on
    const accepted = {
      ...makeOutboxRecord(120, "insertion-pending"),
      sourceDraftRevision: 4,
    };
    const draft: HomeThoughtDraftRecord = {
      spec: sampleSpec({ automaticThought: "thought 120" }),
      sourceRevision: 4,
      updatedAt: draftAt,
      draftCleanup: null,
    };

    const hydrated = Model.ready({
      ...emptyReady,
      homeThoughtDraft: draft,
      thoughtSaveOutbox: [accepted],
    });
    // nothing is erased, and nothing runs on its own
    expect(hydrated.homeThoughtDraft).toEqual(draft);
    expect(hydrated.thoughtSaveOutbox).toEqual([accepted]);
    expect(Model.update(Model.loading, Action.modelReady(hydrated))[1]).toEqual([]);
    // ...but Home must not re-present content the outbox already accepted
    expect(Model.restorableHomeThoughtDraft(hydrated)).toBeNull();
  });

  test("ignores a replayed insertion result for an already-flipped record", () => {
    const accepted = { ...makeOutboxRecord(121, "pending"), sourceDraftRevision: 4 };
    const draft: HomeThoughtDraftRecord = {
      spec: sampleSpec({ automaticThought: "thought 121" }),
      sourceRevision: 4,
      updatedAt: draftAt,
      draftCleanup: null,
    };
    const hydrated = Model.ready({
      ...emptyReady,
      homeThoughtDraft: draft,
      thoughtSaveOutbox: [accepted],
    });

    const [replayed, cmds] = Model.update(
      hydrated,
      Action.thoughtSaveOutboxInsertionSucceeded(accepted.submissionId, insertedAt)
    );

    expect((replayed as Model.Ready).homeThoughtDraft).toEqual(draft);
    expect(cmds.some((cmd) => cmd.cmd === "clear-home-thought-draft")).toBe(false);
    expect((replayed as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
  });

  test("re-presents only a draft that is not already accounted for", () => {
    const draft: HomeThoughtDraftRecord = {
      spec: sampleSpec({ automaticThought: "still mine" }),
      sourceRevision: 5,
      updatedAt: draftAt,
      draftCleanup: null,
    };
    const unrelated = { ...makeOutboxRecord(122, "failed"), sourceDraftRevision: 2 };
    const restorable = Model.ready({
      ...emptyReady,
      homeThoughtDraft: draft,
      thoughtSaveOutbox: [unrelated],
    });
    expect(Model.restorableHomeThoughtDraft(restorable)).toEqual(draft.spec);

    expect(Model.restorableHomeThoughtDraft(emptyReady)).toBeNull();

    // B's clear failed after the same revision was accepted: already accounted for
    const cleanupFailed = Model.ready({
      ...emptyReady,
      homeThoughtDraft: {
        ...draft,
        draftCleanup: {
          status: "clear-failed",
          sourceRevision: 5,
          outboxSubmissionId: unrelated.submissionId,
          lastError: "disk full",
          updatedAt: insertedAt,
        },
      },
      thoughtSaveOutbox: [],
    });
    expect(Model.restorableHomeThoughtDraft(cleanupFailed)).toBeNull();
  });

  test("discarding a draft leaves the outbox and saved thoughts alone", () => {
    const { m, record } = submitted(sampleSpec({ automaticThought: "handoff" }));

    const [discarded, cmds] = Model.update(m, Action.clearHomeThoughtDraft());

    expect((discarded as Model.Ready).homeThoughtDraft).toBeNull();
    expect(cmds).toEqual([Cmd.clearHomeThoughtDraft()]);
    expect((discarded as Model.Ready).thoughtSaveOutbox).toEqual(
      (m as Model.Ready).thoughtSaveOutbox
    );
    expect((discarded as Model.Ready).thoughtSaveOutbox[0].submissionId).toBe(
      record.submissionId
    );
  });
});

test("reserves insertion-pending capacity and blocks duplicate save while insertion is pending", () => {
  let m: Model.Model = {
    ...emptyReady,
    thoughtSaveOutbox: Array.from({ length: 19 }, (_, i) =>
      makeOutboxRecord(i + 1)
    ),
  };
  const spec = sampleSpec({ automaticThought: "reserve me" });

  const reserve = Action.createThought(
    spec,
    new Date("2026-08-11T02:00:00.000Z")
  );
  const [reserved, reserveCmds] = Model.update(m, reserve);
  m = reserved;
  expect((m as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect((m as Model.Ready).thoughtSaveOutbox[19].status).toBe(
    "insertion-pending"
  );
  // the submission carries the id its caller already knows, so the caller can
  // watch exactly its own submission
  expect((m as Model.Ready).thoughtSaveOutbox[19].submissionId).toBe(
    reserve.submissionId
  );
  expect(reserveCmds).toHaveLength(1);

  const [duplicate, duplicateCmds] = Model.update(
    m,
    Action.createThought(spec, new Date("2026-08-11T02:00:01.000Z"))
  );
  expect((duplicate as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect(duplicateCmds).toEqual([]);

  const atCapacity = Action.createThought(
    sampleSpec({ automaticThought: "blocked by capacity" }),
    new Date("2026-08-11T02:00:02.000Z")
  );
  const [overflow, overflowCmds] = Model.update(
    {
      ...(duplicate as Model.Ready),
      thoughtSaveOutbox: Array.from({ length: 20 }, (_, i) =>
        makeOutboxRecord(30 + i)
      ),
    },
    atCapacity
  );
  expect((overflow as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect(overflowCmds).toEqual([]);
  // no cmd to run, but the rejection is never silent: the UI needs something
  // observable to explain why nothing was saved
  expect((overflow as Model.Ready).thoughtSaveResult).toEqual({
    status: "failure",
    submissionId: atCapacity.submissionId,
    stage: "capacity",
    error: null,
  });
});

test("releases a failed insertion reservation and later submissions still proceed", () => {
  let m: Model.Model = emptyReady;
  const [reserved] = Model.update(
    m,
    Action.createThought(
      sampleSpec({ automaticThought: "first save" }),
      new Date("2026-08-11T03:00:00.000Z")
    )
  );
  m = reserved;
  const [pendingRecord] = (m as Model.Ready).thoughtSaveOutbox;
  const firstId = pendingRecord.submissionId;

  const [failed, failedCmds] = Model.update(
    m,
    Action.thoughtSaveOutboxInsertionFailed(firstId, new Error("disk full"))
  );
  m = failed;
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([]);
  expect((m as Model.Ready).thoughtSaveResult).toEqual({
    status: "failure",
    submissionId: firstId,
    stage: "outbox-insert",
    error: expect.any(Error),
  });
  expect(failedCmds).toEqual([]);

  const [second, secondCmds] = Model.update(
    m,
    Action.createThought(
      sampleSpec({ automaticThought: "second save" }),
      new Date("2026-08-11T03:00:01.000Z")
    )
  );
  expect((second as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
  expect((second as Model.Ready).thoughtSaveOutbox[0].submissionId).not.toBe(
    firstId
  );
  expect(secondCmds).toHaveLength(1);
});

test("a failed active write does not block a later pending submission", () => {
  const first = makeOutboxRecord(60, "pending");
  const second = makeOutboxRecord(61, "pending");
  let m: Model.Model = {
    ...emptyReady,
    thoughtSaveOutbox: [first, second],
  };

  const [active, activeCmds] = Model.update(
    m,
    Action.beginThoughtSave(first.submissionId, new Date("2026-08-11T06:00:00.000Z"))
  );
  m = active;
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...first,
    status: "active",
    attemptCount: 1,
    lastAttemptAt: new Date("2026-08-11T06:00:00.000Z"),
    updatedAt: new Date("2026-08-11T06:00:00.000Z"),
  });
  expect(activeCmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  const [failed, failedCmds] = Model.update(
    m,
    Action.thoughtSaveWriteFailed(
      first.submissionId,
      new Error("write failed"),
      new Date("2026-08-11T06:00:01.000Z")
    )
  );
  m = failed;
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...(active as Model.Ready).thoughtSaveOutbox[0],
    status: "failed",
    lastError: "write failed",
    updatedAt: new Date("2026-08-11T06:00:01.000Z"),
  });
  expect((m as Model.Ready).thoughtSaveOutbox[1]).toEqual(second);
  expect(failedCmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  const [next, nextCmds] = Model.update(
    m,
    Action.beginThoughtSave(
      second.submissionId,
      new Date("2026-08-11T06:00:02.000Z")
    )
  );
  expect((next as Model.Ready).thoughtSaveOutbox[1]).toEqual({
    ...second,
    status: "active",
    attemptCount: 1,
    lastAttemptAt: new Date("2026-08-11T06:00:02.000Z"),
    updatedAt: new Date("2026-08-11T06:00:02.000Z"),
  });
  expect(nextCmds).toEqual([
    Cmd.updateThoughtSaveOutbox((next as Model.Ready).thoughtSaveOutbox[1]),
  ]);
});

test("processes one durable FIFO record at a time and skips failures", () => {
  const first = makeOutboxRecord(70, "pending");
  const second = makeOutboxRecord(71, "pending");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [first, second] };
  const now = new Date("2026-08-11T07:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(
    m,
    Action.runThoughtSaveOutbox(now)
  );
  expect((m as Model.Ready).thoughtSaveOutbox.map((record) => record.status)).toEqual([
    "active",
    "pending",
  ]);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);
  const active = m as Model.Ready;

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect(cmds).toEqual([
    Cmd.writeSubmittedThought(first.submissionId, first.thought),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveWriteFailed(first.submissionId, new Error("offline"), now)
  );
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...(active as Model.Ready).thoughtSaveOutbox[0],
    status: "failed",
    lastError: "offline",
    updatedAt: now,
  });
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect((m as Model.Ready).thoughtSaveOutbox.map((record) => record.status)).toEqual([
    "failed",
    "active",
  ]);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[1]),
  ]);
});

test("a durable update that never lands leaves the record recoverable, not stuck active", () => {
  const first = makeOutboxRecord(90, "pending");
  const second = makeOutboxRecord(91, "pending");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [first, second] };
  const now = new Date("2026-08-11T09:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.runThoughtSaveOutbox(now));
  expect((m as Model.Ready).thoughtSaveOutbox[0].status).toBe("active");

  // the runner's `update-thought-save-outbox` write threw: nothing durable
  // changed, so the record must not stay `active` and gate the whole processor
  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveWriteFailed(first.submissionId, new Error("disk full"), now)
  );
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toMatchObject({
    status: "failed",
    lastError: "disk full",
  });

  // ...and the next eligible record can be selected right after
  [m, cmds] = Model.update(
    m,
    Action.runThoughtSaveOutbox(new Date("2026-08-11T09:00:01.000Z"))
  );
  expect((m as Model.Ready).thoughtSaveOutbox.map((r) => r.status)).toEqual([
    "failed",
    "active",
  ]);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[1]),
  ]);
});

test("a durable update that never lands releases the queued Retry it was persisting", () => {
  const stuck: ThoughtSaveOutboxRecord = {
    ...makeOutboxRecord(92, "failed"),
    retryRequested: true,
  };
  const other = makeOutboxRecord(93, "failed");

  // the write that was persisting `retryRequested: true` threw. Storage still
  // holds the pre-update record, so dropping the flag re-syncs with disk - and
  // without it every Retry button in the app stays disabled forever.
  const [m, cmds] = Model.update(
    { ...emptyReady, thoughtSaveOutbox: [stuck, other] },
    Action.thoughtSaveWriteFailed(
      stuck.submissionId,
      new Error("disk full"),
      new Date("2026-08-11T09:10:00.000Z")
    )
  );
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...stuck,
    retryRequested: false,
  });
  expect(cmds).toEqual([]);

  // and Retry works again
  const [retried] = Model.update(m, Action.retryThoughtSave(other.submissionId));
  expect((retried as Model.Ready).thoughtSaveOutbox[1].retryRequested).toBe(true);
});

test("gives one explicit failed retry priority without activating it beside current work", () => {
  const failed = makeOutboxRecord(80, "failed");
  const active = makeOutboxRecord(81, "active");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [failed, active] };
  const now = new Date("2026-08-11T08:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.retryThoughtSave(failed.submissionId));
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...failed,
    retryRequested: true,
  });
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect(cmds).toEqual([]);

  const completedActive = (m as Model.Ready).thoughtSaveOutbox[1];
  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxRemoved(completedActive.submissionId, now)
  );
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([
    expect.objectContaining({
      submissionId: failed.submissionId,
      status: "active",
      retryRequested: false,
      attemptCount: 1,
    }),
  ]);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);
});

test("allows explicit retry to recover an uncertain outbox record left by a restart", () => {
  const uncertain = makeOutboxRecord(85, "uncertain");
  const pending = makeOutboxRecord(86, "pending");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [uncertain, pending] };

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.retryThoughtSave(uncertain.submissionId));
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual({
    ...uncertain,
    retryRequested: true,
  });
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual(
    expect.objectContaining({
      submissionId: uncertain.submissionId,
      status: "active",
      retryRequested: false,
      attemptCount: 1,
    })
  );
  expect((m as Model.Ready).thoughtSaveOutbox[1]).toEqual(pending);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect(cmds).toEqual([
    Cmd.writeSubmittedThought(uncertain.submissionId, uncertain.thought),
  ]);
});

test("ignores a stale write result after its active record has failed", () => {
  const first = makeOutboxRecord(90, "active");
  const second = makeOutboxRecord(91, "pending");
  const now = new Date("2026-08-11T09:00:00.000Z");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [first, second] };

  [m] = Model.update(
    m,
    Action.thoughtSaveWriteFailed(first.submissionId, new Error("offline"), now)
  );
  const [stale, cmds] = Model.update(
    m,
    Action.thoughtSaveWriteSucceeded(first.submissionId, first.thought)
  );

  expect(stale).toBe(m);
  expect(cmds).toEqual([]);
});

test("removes a persisted thought before starting the next FIFO record", () => {
  const first = { ...makeOutboxRecord(100, "active"), attemptCount: 1 };
  const second = makeOutboxRecord(101, "pending");
  const now = new Date("2026-08-11T10:00:00.000Z");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [first, second] };

  let cmds: Cmd.List;
  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveWriteSucceeded(first.submissionId, first.thought)
  );
  expect((m as Model.Ready).thoughts.get(Thought.key(first.thought))).toEqual(first.thought);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(first.submissionId)]);

  [m, cmds] = Model.update(m, Action.thoughtSaveOutboxRemoved(first.submissionId, now));
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([
    expect.objectContaining({ submissionId: second.submissionId, status: "active" }),
  ]);
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);
});

test("retries cleanup failures by removal only and does not auto-retry after hydration", () => {
  const cleanupFailed = {
    ...makeOutboxRecord(110, "cleanup-failed"),
    thoughtPersisted: true,
  };
  const hydrated = Model.ready({ ...emptyReady, thoughtSaveOutbox: [cleanupFailed] });
  expect(Model.update(Model.loading, Action.modelReady(hydrated))[1]).toEqual([]);

  let m: Model.Model = hydrated;
  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.retryThoughtSave(cleanupFailed.submissionId));
  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect(cmds).toEqual([
    Cmd.updateThoughtSaveOutbox((m as Model.Ready).thoughtSaveOutbox[0]),
  ]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxUpdated((m as Model.Ready).thoughtSaveOutbox[0])
  );
  expect((m as Model.Ready).thoughtSaveOutbox[0]).toEqual(
    expect.objectContaining({
      submissionId: cleanupFailed.submissionId,
      status: "active",
      thoughtPersisted: true,
    })
  );
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(cleanupFailed.submissionId)]);
});

test("discards a failed record by removing it directly, isolated from other records", () => {
  const failed = makeOutboxRecord(120, "failed");
  const untouched = makeOutboxRecord(121, "pending");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [failed, untouched] };
  const now = new Date("2026-08-11T11:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.discardThoughtSave(failed.submissionId));
  // straight to removal - no queueing, no write-then-cleanup cycle
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(failed.submissionId)]);

  [m, cmds] = Model.update(m, Action.thoughtSaveOutboxRemoved(failed.submissionId, now));
  // gone, and FIFO picks up the next pending record as usual - discard never
  // touches anything but the record it targeted
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([
    expect.objectContaining({ submissionId: untouched.submissionId, status: "active" }),
  ]);
});

test("discards an uncertain record left by a restart", () => {
  const uncertain = makeOutboxRecord(122, "uncertain");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [uncertain] };
  const now = new Date("2026-08-11T11:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.discardThoughtSave(uncertain.submissionId));
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(uncertain.submissionId)]);

  [m, cmds] = Model.update(m, Action.thoughtSaveOutboxRemoved(uncertain.submissionId, now));
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([]);
});

test("discards a cleanup-failed record without touching the already-saved Thought", () => {
  const cleanupFailed = {
    ...makeOutboxRecord(123, "cleanup-failed"),
    thoughtPersisted: true,
  };
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [cleanupFailed] };
  const now = new Date("2026-08-11T11:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.discardThoughtSave(cleanupFailed.submissionId));
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(cleanupFailed.submissionId)]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxRemoved(cleanupFailed.submissionId, now)
  );
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([]);
  // the discard is only ever the redundant outbox bookkeeping record - the
  // saved Thought itself was never in `thoughtSaveOutbox` in the first place
  expect((m as Model.Ready).thoughts.size).toBe(0);
});

test("refuses to discard a record still in flight", () => {
  for (const status of ["insertion-pending", "pending", "active"] as const) {
    const record = makeOutboxRecord(130, status);
    const m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [record] };
    const [next, cmds] = Model.update(m, Action.discardThoughtSave(record.submissionId));
    expect(cmds).toEqual([]);
    expect(next).toBe(m);
  }
});

test("a failed removal from Discard leaves the record exactly as it was, never mislabels it", () => {
  const failed = makeOutboxRecord(131, "failed");
  let m: Model.Model = { ...emptyReady, thoughtSaveOutbox: [failed] };
  const now = new Date("2026-08-11T11:00:00.000Z");

  let cmds: Cmd.List;
  [m, cmds] = Model.update(m, Action.discardThoughtSave(failed.submissionId));
  expect(cmds).toEqual([Cmd.removeThoughtSaveOutbox(failed.submissionId)]);

  [m, cmds] = Model.update(
    m,
    Action.thoughtSaveOutboxRemovalFailed(failed.submissionId, new Error("disk full"), now)
  );
  // the removal-failed guard only mutates an "active" D-path record, so a
  // failed non-active removal (from Discard) is a no-op, not a relabel
  expect((m as Model.Ready).thoughtSaveOutbox).toEqual([failed]);
  expect(cmds).toEqual([]);
});
