import _ from "lodash";
import { z } from "zod";
import type { LocaleTag } from "../i18n/use-i18n";
import type {
  HomeThoughtDraftRecord,
  ThoughtSaveOutboxRecord,
} from "../platform/storage/storage";
import * as Routes from "../routes";
import * as Action from "./action";
import * as Cmd from "./cmd";
import * as Distortion from "./distortion";
import * as Settings from "./settings";
import * as Thought from "./thought";
import * as Archive from "./archive/thoughts-archive";

export type Model = Loading | Ready;
export type Loading = typeof loading;
export type ColorScheme = "light" | "dark";
export interface Ready {
  status: "ready";
  sessionAuthed: boolean;
  distortionData: Distortion.Data;
  thoughts: ReadonlyMap<Thought.Key, Thought.Thought>;
  thoughtParseErrors: ReadonlyMap<Thought.Key, z.ZodError<Thought.Thought>>;
  settings: Settings.Settings;
  onboardingCompletion: OnboardingCompletion;
  homeThoughtDraft: HomeThoughtDraftRecord | null;
  homeThoughtDraftRevision: number;
  homeThoughtDraftPersistence: PersistenceState;
  thoughtSaveOutbox: readonly ThoughtSaveOutboxRecord[];
  thoughtSaveResult: ThoughtSaveResult;
  deviceColorScheme: ColorScheme | null;
  deviceLocale: LocaleTag;
}
export type OnboardingCompletion =
  | "idle"
  | "saving"
  | { status: "failure"; error: unknown };
export type PersistenceState = "idle" | { status: "failure"; error: unknown };
export type ThoughtSaveResult =
  | "idle"
  | {
      status: "failure";
      submissionId: Thought.Id;
      stage: "outbox-insert";
      error: unknown;
    };

export const loading = { status: "loading" } as const;
export const init: readonly [Model, Cmd.List] = [loading, [Cmd.loadModel]];
export function ready(p: Omit<Ready, "status">): Ready {
  return {
    status: "ready",
    ...p,
    homeThoughtDraftRevision:
      p.homeThoughtDraft?.sourceRevision ?? p.homeThoughtDraftRevision,
    thoughtSaveOutbox: p.thoughtSaveOutbox.map((record) =>
      record.status === "active" ? { ...record, status: "uncertain" } : record
    ),
  };
}

export interface Match<O> {
  ready: (m: Ready) => O;
  loading: (m: Loading) => O;
}
export function match<O>(m: Model, matcher: Match<O>): O {
  return matcher[m.status](m as any);
}

export function colorScheme(m: Model): ColorScheme {
  return match(m, {
    ready: (m) => m.settings.theme ?? m.deviceColorScheme ?? "light",
    loading: () => "light",
  });
}
export function locale(m: Model): LocaleTag {
  return match(m, {
    ready: (m) => m.settings.locale ?? m.deviceLocale ?? "en",
    loading: () => "en",
  });
}
export function thoughtsList(m: Ready): readonly Thought.Thought[] {
  return _.sortBy(Array.from(m.thoughts.values()), (t) => t.createdAt);
}
export function toArchive(m: Ready): Archive.Archive {
  return { thoughts: thoughtsList(m) };
}

type Pair<A, B> = readonly [A, B];
export function thoughtsByDate(
  m: Ready
): readonly Pair<string, readonly Thought.Thought[]>[] {
  const g = _.groupBy(thoughtsList(m), (t) => t.createdAt.toDateString());
  const pairs = Object.entries(g) as readonly Pair<
    string,
    readonly Thought.Thought[]
  >[];
  // Rookie mistake, string dates are not sorted the way we'd expect:
  // return _.sortBy(pairs, ([date]) => date).map(
  // Better, but re-parsing stringified dates feels a bit wasteful:
  // return _.sortBy(pairs, ([date]) => new Date(date).getTime()).map(
  // We know each thought-group has at least one entry, so let's do this:
  return (
    _.sortBy(pairs, ([date, thoughts]) => -thoughts[0].createdAt.getTime())
      // The thought-groups themselves must be sorted too:
      .map(([date, thoughts]) => [
        date,
        _.sortBy(thoughts, (t) => -t.createdAt.getTime()),
      ])
  );
}

export function update(m: Model, a: Action.Action): readonly [Model, Cmd.List] {
  switch (a.action) {
    case "model-ready": {
      const m2 = m.status === "loading" ? a.model : m;
      return [m2, []];
    }
    default: {
      if (m.status === "loading") return [m, []];
      return updateReady(m, a);
    }
  }
}
function updateReady(m: Ready, a: Action.Action): readonly [Model, Cmd.List] {
  switch (a.action) {
    case "model-ready": {
      return [m, []];
    }
    case "set-session-authed": {
      return [{ ...m, sessionAuthed: a.value }, []];
    }
    case "set-pincode": {
      return updateSettings(
        { ...m, sessionAuthed: !!a.value },
        { pincode: a.value }
      );
    }
    case "set-history-label": {
      return updateSettings(m, { historyLabels: a.value });
    }
    case "set-locale": {
      return updateSettings(m, { locale: a.value });
    }
    case "set-theme": {
      return updateSettings(m, { theme: a.value });
    }
    case "set-existing-user": {
      return updateSettings(m, { existingUser: true });
    }
    case "begin-onboarding-completion": {
      if (m.onboardingCompletion === "saving") return [m, []];
      return [
        { ...m, onboardingCompletion: "saving" },
        [Cmd.completeOnboarding({ ...m.settings, existingUser: true })],
      ];
    }
    case "onboarding-completion-succeeded": {
      return [
        {
          ...m,
          onboardingCompletion: "idle",
          settings: { ...m.settings, existingUser: true },
        },
        [],
      ];
    }
    case "onboarding-completion-failed": {
      return [
        {
          ...m,
          onboardingCompletion: { status: "failure", error: a.error },
        },
        [],
      ];
    }
    case "set-reminders": {
      return updateSettings(m, { reminders: a.value });
    }
    case "set-device-color-scheme": {
      return [{ ...m, deviceColorScheme: a.value }, []];
    }
    case "update-home-thought-draft": {
      return updateHomeDraft(m, a.spec, a.now);
    }
    case "flush-home-thought-draft": {
      return flushHomeDraft(m);
    }
    case "clear-home-thought-draft": {
      return clearHomeDraft(m);
    }
    case "home-thought-draft-write-failed": {
      return [
        { ...m, homeThoughtDraftPersistence: { status: "failure", error: a.error } },
        [],
      ];
    }
    case "create-thought": {
      return createThoughtSubmission(m, a.spec, a.now);
    }
    case "home-thought-draft-cleanup-failed": {
      // Keep whatever the user has now; only record why the durable clear failed.
      const base = m.homeThoughtDraft ?? a.record;
      const record: HomeThoughtDraftRecord = {
        ...base,
        draftCleanup: {
          status: "clear-failed",
          sourceRevision: a.record.sourceRevision,
          outboxSubmissionId: a.outboxSubmissionId,
          lastError: a.error instanceof Error ? a.error.message : String(a.error),
          updatedAt: a.now,
        },
      };
      return [
        { ...m, homeThoughtDraft: record },
        [Cmd.writeHomeThoughtDraft(record)],
      ];
    }
    case "thought-save-outbox-insertion-succeeded": {
      // "A": the submission is durable. Reset-blocking work stops here; "B" below
      // is best-effort draft cleanup that must never undo or duplicate A.
      const accepted = m.thoughtSaveOutbox.find(
        (record) =>
          record.submissionId === a.submissionId &&
          record.status === "insertion-pending"
      );
      const [cleaned, cleanupCmds] = reconcileHomeDraft(
        {
          ...m,
          thoughtSaveOutbox: m.thoughtSaveOutbox.map((record) =>
            record === accepted ? { ...record, status: "pending" } : record
          ),
        },
        accepted
      );
      const [next, saveCmds] = selectNextThoughtSave(cleaned, a.now);
      return [next, [...cleanupCmds, ...saveCmds]];
    }
    case "thought-save-outbox-insertion-failed": {
      return [
        {
          ...m,
          thoughtSaveOutbox: m.thoughtSaveOutbox.filter(
            (record) => record.submissionId !== a.submissionId
          ),
          thoughtSaveResult: {
            status: "failure",
            submissionId: a.submissionId,
            stage: "outbox-insert",
            error: a.error,
          },
        },
        [],
      ];
    }
    case "begin-thought-save": {
      return selectNextThoughtSave(m, a.now, a.submissionId);
    }
    case "run-thought-save-outbox": {
      return selectNextThoughtSave(m, a.now);
    }
    case "retry-thought-save": {
      if (m.thoughtSaveOutbox.some((record) => record.retryRequested)) {
        return [m, []];
      }
      return updateThoughtSaveRecord(m, a.submissionId, (record) => {
        if (
          record.status !== "failed" &&
          record.status !== "cleanup-failed" &&
          record.status !== "uncertain"
        ) {
          return record;
        }
        return { ...record, retryRequested: true };
      });
    }
    case "thought-save-outbox-updated": {
      const current = m.thoughtSaveOutbox.find(
        (record) => record.submissionId === a.value.submissionId
      );
      if (current === undefined || !sameThoughtSaveRecord(current, a.value)) {
        return [m, []];
      }
      if (current.status === "active") {
        return current.thoughtPersisted
          ? [m, [Cmd.removeThoughtSaveOutbox(current.submissionId)]]
          : [m, [Cmd.writeSubmittedThought(current.submissionId, current.thought)]];
      }
      if (
        current.status === "failed" ||
        current.status === "cleanup-failed" ||
        current.status === "uncertain"
      ) {
        return selectNextThoughtSave(m, current.updatedAt);
      }
      return [m, []];
    }
    case "thought-save-write-succeeded": {
      const record = m.thoughtSaveOutbox.find(
        (candidate) => candidate.submissionId === a.submissionId
      );
      if (
        record === undefined ||
        record.status !== "active" ||
        record.thoughtPersisted ||
        !sameThought(record.thought, a.thought)
      ) {
        return [m, []];
      }
      const [next, cmds] = updateThoughtSaveRecord(m, a.submissionId, (current) => ({
        ...current,
        thoughtPersisted: true,
      }));
      const thoughts = new Map(m.thoughts);
      thoughts.set(Thought.key(a.thought), a.thought);
      return [{ ...(next as Ready), thoughts }, cmds];
    }
    case "thought-save-write-failed": {
      const record = m.thoughtSaveOutbox.find(
        (candidate) => candidate.submissionId === a.submissionId
      );
      if (record?.status !== "active" || record.thoughtPersisted) return [m, []];
      return updateThoughtSaveRecord(m, a.submissionId, (record) => ({
        ...record,
        status: "failed",
        lastError: a.error instanceof Error ? a.error.message : String(a.error),
        updatedAt: a.now,
      }));
    }
    case "thought-save-outbox-removed": {
      return selectNextThoughtSave(
        {
          ...m,
          thoughtSaveOutbox: m.thoughtSaveOutbox.filter(
            (record) => record.submissionId !== a.submissionId
          ),
        },
        a.now
      );
    }
    case "thought-save-outbox-removal-failed": {
      const record = m.thoughtSaveOutbox.find(
        (candidate) => candidate.submissionId === a.submissionId
      );
      if (record?.status !== "active" || !record.thoughtPersisted) return [m, []];
      return updateThoughtSaveRecord(m, a.submissionId, (current) => ({
        ...current,
        status: "cleanup-failed",
        lastError: a.error instanceof Error ? a.error.message : String(a.error),
        updatedAt: a.now,
      }));
    }
    case "update-thought": {
      return writeThought(m, a.value);
    }
    case "delete-thought": {
      const thoughts = new Map(m.thoughts);
      const k = Thought.keyFromId.decode(a.value);
      thoughts.delete(k);
      const m2: Model = { ...m, thoughts };
      return [m2, [Cmd.deleteThought(k)]];
    }
    case "import-archive": {
        const thoughts = new Map(m.thoughts);

        for (const t of a.value.thoughts) {
            thoughts.set(Thought.key(t), t);
        }

        const m2: Model = { ...m, thoughts };

        return [
            m2,
            a.value.thoughts.map((t) => Cmd.writeThought(t)),
        ];
    }
    // case "import-archive": {
    //   const thoughts = new Map(
    //       a.value.thoughts.map((t) => [Thought.key(t), t] as const)
    //   );
    //   const m2: Model = { ...m, thoughts };
    //   return [
    //     m2,
    //     [
    //       ...thoughtsList(m).map((t) => Cmd.deleteThought(Thought.key(t))),
    //       ...a.value.thoughts.map((t) => Cmd.writeThought(t)),
    //     ],
    //   ];
    // }
    default:
      throw new Error(`no such action: ${a satisfies never}`);
  }
}
function writeThought(
  m: Ready,
  thought: Thought.Thought
): readonly [Model, Cmd.List] {
  const thoughts = new Map(m.thoughts);
  thoughts.set(Thought.key(thought), thought);
  const m2: Model = { ...m, thoughts };
  const cmds = [
    Cmd.writeThought(thought),
    Cmd.navigate(Routes.thoughtViewV2(thought.uuid)),
  ];
  return [m2, cmds];
}

function cloneSpec(spec: Thought.Spec): Thought.Spec {
  return {
    automaticThought: spec.automaticThought,
    cognitiveDistortions: new Set(spec.cognitiveDistortions),
    challenge: spec.challenge,
    alternativeThought: spec.alternativeThought,
  };
}

function updateHomeDraft(
  m: Ready,
  spec: Thought.Spec,
  now: Date
): readonly [Model, Cmd.List] {
  const revision = m.homeThoughtDraftRevision + 1;
  if (!Thought.isMeaningfulSpec(spec)) {
    return [
      {
        ...m,
        homeThoughtDraft: null,
        homeThoughtDraftRevision: revision,
        homeThoughtDraftPersistence: "idle",
      },
      [Cmd.clearHomeThoughtDraft()],
    ];
  }
  const record: HomeThoughtDraftRecord = {
    spec: cloneSpec(spec),
    sourceRevision: revision,
    updatedAt: now,
    draftCleanup: null,
  };
  return [
    {
      ...m,
      homeThoughtDraft: record,
      homeThoughtDraftRevision: revision,
      homeThoughtDraftPersistence: "idle",
    },
    [Cmd.writeHomeThoughtDraft(record)],
  ];
}

function flushHomeDraft(m: Ready): readonly [Model, Cmd.List] {
  if (m.homeThoughtDraft === null) return [m, []];
  return [
    { ...m, homeThoughtDraftPersistence: "idle" },
    [Cmd.writeHomeThoughtDraft(m.homeThoughtDraft)],
  ];
}

function clearHomeDraft(m: Ready): readonly [Model, Cmd.List] {
  return [
    {
      ...m,
      homeThoughtDraft: null,
      homeThoughtDraftRevision: m.homeThoughtDraftRevision + 1,
      homeThoughtDraftPersistence: "idle",
    },
    [Cmd.clearHomeThoughtDraft()],
  ];
}

/**
 * "B" of the A→B handoff: clear the Home draft the accepted submission was
 * snapshotted from. Guarded by revision, so newer user input is never erased.
 */
function reconcileHomeDraft(
  m: Ready,
  accepted: ThoughtSaveOutboxRecord | undefined
): readonly [Ready, Cmd.List] {
  const draft = m.homeThoughtDraft;
  if (accepted === undefined || draft === null) return [m, []];
  if (m.homeThoughtDraftRevision !== accepted.sourceDraftRevision) return [m, []];
  return [
    {
      ...m,
      homeThoughtDraft: null,
      homeThoughtDraftRevision: m.homeThoughtDraftRevision + 1,
      homeThoughtDraftPersistence: "idle",
    },
    [
      Cmd.clearHomeThoughtDraft({
        record: draft,
        outboxSubmissionId: accepted.submissionId,
      }),
    ],
  ];
}

function createThoughtSubmission(
  m: Ready,
  spec: Thought.Spec,
  now: Date
): readonly [Model, Cmd.List] {
  if (!Thought.isMeaningfulSpec(spec)) return [m, []];
  if (m.thoughtSaveOutbox.length >= 20) return [m, []];
  if (
    m.thoughtSaveOutbox.some((record) => record.status === "insertion-pending")
  ) {
    return [m, []];
  }
  const thought = Thought.create(cloneSpec(spec), now);
  const record: ThoughtSaveOutboxRecord = {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision:
      m.homeThoughtDraft?.sourceRevision ?? m.homeThoughtDraftRevision,
    attemptCount: 0,
    lastAttemptAt: now,
    lastError: null,
    retryRequested: false,
    thoughtPersisted: false,
    updatedAt: now,
    status: "insertion-pending",
  };
  return [
    {
      ...m,
      thoughtSaveOutbox: [...m.thoughtSaveOutbox, record],
      thoughtSaveResult: "idle",
    },
    [Cmd.insertThoughtSaveOutbox(record)],
  ];
}

function updateThoughtSaveRecord(
  m: Ready,
  submissionId: Thought.Id,
  recipe: (record: ThoughtSaveOutboxRecord) => ThoughtSaveOutboxRecord
): readonly [Model, Cmd.List] {
  let nextRecord: ThoughtSaveOutboxRecord | null = null;
  const nextOutbox = m.thoughtSaveOutbox.map((record) => {
    if (record.submissionId !== submissionId) return record;
    nextRecord = recipe(record);
    return nextRecord;
  });
  if (nextRecord === null) return [m, []];
  return [
    { ...m, thoughtSaveOutbox: nextOutbox },
    [Cmd.updateThoughtSaveOutbox(nextRecord)],
  ];
}

function selectNextThoughtSave(
  m: Ready,
  now: Date,
  submissionId?: Thought.Id
): readonly [Model, Cmd.List] {
  if (m.thoughtSaveOutbox.some((record) => record.status === "active")) {
    return [m, []];
  }
  const record = submissionId === undefined
    ? m.thoughtSaveOutbox.find(
        (candidate) =>
          candidate.retryRequested &&
          (candidate.status === "failed" ||
            candidate.status === "cleanup-failed" ||
            candidate.status === "uncertain")
      ) ?? m.thoughtSaveOutbox.find((candidate) => candidate.status === "pending")
    : m.thoughtSaveOutbox.find(
        (candidate) => candidate.submissionId === submissionId && candidate.status === "pending"
      );
  if (record === undefined) return [m, []];
  const active = {
    ...record,
    status: "active" as const,
    retryRequested: false,
    attemptCount: record.attemptCount + 1,
    lastAttemptAt: now,
    updatedAt: now,
  };
  return [
    {
      ...m,
      thoughtSaveOutbox: m.thoughtSaveOutbox.map((candidate) =>
        candidate.submissionId === active.submissionId ? active : candidate
      ),
    },
    [Cmd.updateThoughtSaveOutbox(active)],
  ];
}

function sameThoughtSaveRecord(
  left: ThoughtSaveOutboxRecord,
  right: ThoughtSaveOutboxRecord
): boolean {
  return (
    left.submissionId === right.submissionId &&
    left.status === right.status &&
    left.attemptCount === right.attemptCount &&
    left.lastAttemptAt.getTime() === right.lastAttemptAt.getTime() &&
    left.lastError === right.lastError &&
    left.retryRequested === right.retryRequested &&
    left.thoughtPersisted === right.thoughtPersisted &&
    left.updatedAt.getTime() === right.updatedAt.getTime() &&
    sameThought(left.thought, right.thought)
  );
}

function sameThought(left: Thought.Thought, right: Thought.Thought): boolean {
  return _.isEqual(left, right);
}

function updateSettings(
  m: Ready,
  s: Partial<Settings.Settings>
): readonly [Model, Cmd.List] {
  const m2: Model = { ...m, settings: { ...m.settings, ...s } };
  return [m2, [Cmd.writeSettings(m2.settings)]];
}
