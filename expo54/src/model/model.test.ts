import { Action, Cmd, DistortionData, Model, Settings, Thought } from ".";
import type {
  HomeThoughtDraftRecord,
  ThoughtSaveOutboxRecord,
} from "../platform/storage/storage";

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

test("reserves insertion-pending capacity and blocks duplicate save while insertion is pending", () => {
  let m: Model.Model = {
    ...emptyReady,
    thoughtSaveOutbox: Array.from({ length: 19 }, (_, i) =>
      makeOutboxRecord(i + 1)
    ),
  };
  const spec = sampleSpec({ automaticThought: "reserve me" });

  const [reserved, reserveCmds] = Model.update(
    m,
    Action.createThought(spec, new Date("2026-08-11T02:00:00.000Z"))
  );
  m = reserved;
  expect((m as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect((m as Model.Ready).thoughtSaveOutbox[19].status).toBe(
    "insertion-pending"
  );
  expect(reserveCmds).toHaveLength(1);

  const [duplicate, duplicateCmds] = Model.update(
    m,
    Action.createThought(spec, new Date("2026-08-11T02:00:01.000Z"))
  );
  expect((duplicate as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect(duplicateCmds).toEqual([]);

  const [overflow, overflowCmds] = Model.update(
    {
      ...(duplicate as Model.Ready),
      thoughtSaveOutbox: Array.from({ length: 20 }, (_, i) =>
        makeOutboxRecord(30 + i)
      ),
    },
    Action.createThought(
      sampleSpec({ automaticThought: "blocked by capacity" }),
      new Date("2026-08-11T02:00:02.000Z")
    )
  );
  expect((overflow as Model.Ready).thoughtSaveOutbox).toHaveLength(20);
  expect(overflowCmds).toEqual([]);
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
