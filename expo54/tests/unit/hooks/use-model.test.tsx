/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Action, DistortionData, Model, Settings, Thought } from "@/src/model";
import { ModelProvider, useModel } from "@/src/hooks/use-model";
import { homeThoughtDraft } from "@/src/platform/storage/home-thought-draft";
import { thoughtSaveOutbox } from "@/src/platform/storage/thought-save-outbox";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/src/platform/storage/thought-save-outbox";
import { resetAsyncStorage } from "@/tests/support/async-storage";

function sampleSpec(overrides: Partial<Thought.Spec> = {}): Thought.Spec {
  return {
    ...Thought.emptySpec(),
    automaticThought: "I always mess this up",
    ...overrides,
  };
}

afterEach(async () => {
  await resetAsyncStorage();
});

test("use-model basics", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  const model = () => result.current[0];
  const ready = () => {
    const m = model();
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  const dispatch = () => result.current[1];
  expect(model()).toBe(Model.loading);
  await waitFor(() => expect(model().status).toBe("ready"));
  expect(ready().thoughts.size).toBe(0);
  expect(ready().thoughtSaveOutbox).toEqual([]);
  expect(ready().settings.theme).toBe(null);
  act(() => dispatch()(Action.createThought(Thought.emptySpec(), new Date(0))));
  expect(ready().thoughts.size).toBe(0);
  expect(ready().thoughtSaveOutbox).toEqual([]);
  act(() => dispatch()(Action.setTheme("dark")));
  expect(ready().settings.theme).toBe("dark");
});

test("use-model hydrates the durable draft and unresolved outbox without writing", async () => {
  await resetAsyncStorage();
  const draft = {
    spec: sampleSpec({ automaticThought: "restored draft" }),
    sourceRevision: 4,
    updatedAt: new Date("2026-08-11T00:00:00.000Z"),
    draftCleanup: {
      status: "clear-failed" as const,
      sourceRevision: 3,
      outboxSubmissionId: "00000000-0000-4000-8000-000000000004" as Thought.Id,
      lastError: "draft clear failed",
      updatedAt: new Date("2026-08-11T00:00:01.000Z"),
    },
  };
  const thought = Thought.create(
    sampleSpec({ automaticThought: "interrupted save" }),
    new Date("2026-08-11T00:00:02.000Z"),
  );
  const active = {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: 4,
    attemptCount: 2,
    lastAttemptAt: new Date("2026-08-11T00:00:03.000Z"),
    lastError: "network interrupted",
    retryRequested: true,
    thoughtPersisted: false,
    updatedAt: new Date("2026-08-11T00:00:04.000Z"),
    status: "active" as const,
  };
  await homeThoughtDraft(DistortionData, AsyncStorage).write(draft);
  await thoughtSaveOutbox(DistortionData, AsyncStorage).insert(active);
  const setItem = jest.spyOn(AsyncStorage, "setItem");
  setItem.mockClear();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });

  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  const hydrated = result.current[0] as Model.Ready;
  expect(hydrated.homeThoughtDraft).toEqual(draft);
  expect(hydrated.homeThoughtDraftRevision).toBe(4);
  expect(hydrated.thoughtSaveOutbox).toEqual([
    { ...active, status: "uncertain" },
  ]);
  expect(setItem).not.toHaveBeenCalled();
  setItem.mockRestore();
});

// Regression test for #7: confirm every setting propagates through the real
// ModelProvider context (not just the pure reducer) to any consumer reading
// useModel(), since that's the actual mechanism screens rely on for reactivity.
test("use-model settings propagate through context for every consumer", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  const model = () => result.current[0];
  const ready = () => {
    const m = model();
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  const dispatch = () => result.current[1];
  await waitFor(() => expect(model().status).toBe("ready"));

  // theme: settings value and its derived consumer (Model.colorScheme) both update
  act(() => dispatch()(Action.setTheme("dark")));
  expect(ready().settings.theme).toBe("dark");
  expect(Model.colorScheme(ready())).toBe("dark");

  // locale: settings value and its derived consumer (Model.locale) both update
  act(() => dispatch()(Action.setLocale("es")));
  expect(ready().settings.locale).toBe("es");
  expect(Model.locale(ready())).toBe("es");

  // reminders
  act(() => dispatch()(Action.setReminders(true)));
  expect(ready().settings.reminders).toBe(true);

  // history label: settings value and its consumer (Thought.label) both update
  const thought = Thought.create(Thought.emptySpec(), new Date(0));
  act(() => dispatch()(Action.setHistoryLabel("automatic-thought")));
  expect(ready().settings.historyLabels).toBe("automatic-thought");
  expect(Thought.label(thought, ready())).toBe(thought.automaticThought);

  // pincode: settings value and its consumer (auth gate condition) both update
  expect(ready().settings.pincode).toBe(null);
  act(() => dispatch()(Action.setPincode("1234")));
  expect(ready().settings.pincode).toBe("1234");
  expect(ready().sessionAuthed).toBe(true); // set-pincode authenticates the session that set it
  act(() => dispatch()(Action.setPincode(null)));
  expect(ready().settings.pincode).toBe(null);
});

test("use-model reports completion persistence failure", async () => {
  const error = new Error("settings write failed");
  const multiSet = jest
    .spyOn(AsyncStorage, "multiSet")
    .mockRejectedValueOnce(error);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  act(() => result.current[1](Action.beginOnboardingCompletion()));
  await waitFor(() =>
    expect((result.current[0] as Model.Ready).onboardingCompletion).toEqual({
      status: "failure",
      error,
    }),
  );
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(false);
  multiSet.mockRestore();
});

test("use-model reports completion success only after persistence resolves", async () => {
  let resolveWrite!: () => void;
  const writePending = new Promise<void>((resolve) => {
    resolveWrite = resolve;
  });
  const multiSet = jest
    .spyOn(AsyncStorage, "multiSet")
    .mockReturnValueOnce(writePending);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  act(() => result.current[1](Action.beginOnboardingCompletion()));
  await waitFor(() =>
    expect(multiSet).toHaveBeenCalledWith(
      expect.arrayContaining([[Settings.existingUserKey, "1"]]),
    ),
  );
  expect((result.current[0] as Model.Ready).onboardingCompletion).toBe(
    "saving",
  );
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(false);

  resolveWrite();
  await waitFor(() =>
    expect((result.current[0] as Model.Ready).onboardingCompletion).toBe(
      "idle",
    ),
  );
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(true);
  multiSet.mockRestore();
});

test("use-model persists one submitted snapshot after outbox insertion succeeds", async () => {
  let releaseWrite!: () => void;
  const writePending = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const setItem = jest
    .spyOn(AsyncStorage, "setItem")
    .mockImplementation(async (key: string, value: string) => {
      if (key === THOUGHT_SAVE_OUTBOX_KEY) {
        await writePending;
      }
      return Promise.resolve(value) as unknown as Promise<void>;
    });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  const spec = sampleSpec({ automaticThought: "original snapshot" });
  act(() =>
    result.current[1](
      Action.createThought(spec, new Date("2026-08-11T04:00:00.000Z")),
    ),
  );
  spec.automaticThought = "mutated after dispatch";
  act(() =>
    result.current[1](
      Action.createThought(spec, new Date("2026-08-11T04:00:01.000Z")),
    ),
  );

  expect((result.current[0] as Model.Ready).thoughtSaveOutbox).toHaveLength(1);
  expect((result.current[0] as Model.Ready).thoughts.size).toBe(0);

  releaseWrite();

  await waitFor(() =>
    expect((result.current[0] as Model.Ready).thoughtSaveOutbox).toEqual([]),
  );
  expect((result.current[0] as Model.Ready).thoughts).toEqual(
    new Map([
      [
        expect.any(String),
        expect.objectContaining({ automaticThought: "original snapshot" }),
      ],
    ]),
  );

  const outboxWrites = setItem.mock.calls.filter(
    ([key]) => key === THOUGHT_SAVE_OUTBOX_KEY,
  );
  expect(
    outboxWrites.map(([, value]) => JSON.parse(value as string).records),
  ).toEqual([
    [expect.objectContaining({ status: "insertion-pending" })],
    [expect.objectContaining({ status: "active", thoughtPersisted: false })],
    [expect.objectContaining({ status: "active", thoughtPersisted: true })],
    [],
  ]);
  setItem.mockRestore();
});

test("use-model releases insertion-pending reservation when outbox insertion fails", async () => {
  const error = new Error("outbox write failed");
  const setItem = jest
    .spyOn(AsyncStorage, "setItem")
    .mockImplementation(async (key: string, value: string) => {
      if (key === THOUGHT_SAVE_OUTBOX_KEY) throw error;
      return Promise.resolve(value) as unknown as Promise<void>;
    });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  act(() =>
    result.current[1](
      Action.createThought(
        sampleSpec({ automaticThought: "will fail to queue" }),
        new Date("2026-08-11T05:00:00.000Z"),
      ),
    ),
  );

  await waitFor(() =>
    expect((result.current[0] as Model.Ready).thoughtSaveOutbox).toEqual([]),
  );
  expect((result.current[0] as Model.Ready).thoughtSaveResult).toEqual({
    status: "failure",
    submissionId: expect.any(String),
    stage: "outbox-insert",
    error,
  });
  setItem.mockRestore();
});
