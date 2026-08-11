/**
 * @jest-environment jsdom
 */
import { Storage } from "@/src";
import { DistortionData, Thought } from "@/src/model";
import { ModelProvider } from "@/src/hooks/use-model";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import type { ThoughtSaveOutboxRecord } from "@/src/platform/storage/storage";
import { HOME_THOUGHT_DRAFT_KEY } from "@/src/platform/storage/home-thought-draft";
import Home from "@/src/app/v2/(public)/(tabs)/index";
import { HeroUINativeProvider } from "heroui-native/provider";
import { AppState, type AppStateStatus } from "react-native";

jest.mock("@/src/i18n/use-i18n", () => ({
  ...jest.requireActual("@/src/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

function spec(automaticThought: string): Thought.Spec {
  return { ...Thought.emptySpec(), automaticThought };
}

function record(
  seed: number,
  status: ThoughtSaveOutboxRecord["status"]
): ThoughtSaveOutboxRecord {
  const thought = Thought.create(
    spec(`recovery ${seed}`),
    new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
  );
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: seed,
    attemptCount: seed + 1,
    lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 10, seed)),
    lastError: status === "failed" ? `failed-${seed}` : null,
    retryRequested: status === "failed",
    thoughtPersisted: status === "cleanup-failed",
    updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 20, seed)),
    status,
  };
}

// Home mounts/unmounts under a provider that outlives it, the way a route exit works.
function HomeHost(props: { home: boolean }) {
  return React.createElement(
    HeroUINativeProvider,
    null,
    React.createElement(
      ModelProvider,
      null,
      props.home ? React.createElement(Home) : null
    )
  );
}

function renderHome() {
  return render(React.createElement(HomeHost, { home: true }));
}

function draftWrites(setItem: jest.SpyInstance): string[] {
  return setItem.mock.calls
    .filter(([key]) => key === HOME_THOUGHT_DRAFT_KEY)
    .map(([, value]) => value as string);
}

// AsyncStorage's jest mock is already a jest.fn, so spyOn hands back that very
// mock - mockRestore() would strip its implementation for every later test.
function captureAppState() {
  const handlers: ((state: AppStateStatus) => void)[] = [];
  const remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((type, handler) => {
    if (type === "change") handlers.push(handler as any);
    return { remove } as any;
  });
  return { handlers, remove };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

let appState: ReturnType<typeof captureAppState>;

beforeEach(() => {
  appState = captureAppState();
});

describe("Home draft lifecycle", () => {
  let setItem: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    setItem.mockClear();
  });

  // hydration needs real timers; the debounce assertions that follow need fake ones.
  async function mounted() {
    jest.useRealTimers();
    const view = renderHome();
    await waitFor(() =>
      expect(view.getByTestId("automatic-thought-input")).toBeTruthy()
    );
    setItem.mockClear();
    jest.useFakeTimers();
    return {
      ...view,
      exitRoute: () =>
        view.rerender(React.createElement(HomeHost, { home: false })),
    };
  }

  test("debounces draft writes for 500ms and flushes once on a meaningful pause", async () => {
    const view = await mounted();
    const input = view.getByTestId("automatic-thought-input");

    fireEvent.changeText(input, "one");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(draftWrites(setItem)).toHaveLength(0);

    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "one two");
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(draftWrites(setItem)).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await settle();
    const writes = draftWrites(setItem);
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]).spec.automaticThought).toBe("one two");
  });

  test("flushes pending draft work on route exit, and writes nothing when idle", async () => {
    const idle = await mounted();
    idle.exitRoute();
    await settle();
    expect(draftWrites(setItem)).toHaveLength(0);
    idle.unmount();

    const view = await mounted();
    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "leaving");
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(draftWrites(setItem)).toHaveLength(0);

    view.exitRoute();
    await settle();
    const writes = draftWrites(setItem);
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]).spec.automaticThought).toBe("leaving");
  });

  test("flushes the latest draft when the app backgrounds, and unregisters on unmount", async () => {
    const view = await mounted();
    expect(appState.handlers).toHaveLength(1);

    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "backgrounded");
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(draftWrites(setItem)).toHaveLength(0);

    await act(async () => {
      appState.handlers[0]("background");
    });
    await settle();
    const writes = draftWrites(setItem);
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]).spec.automaticThought).toBe("backgrounded");

    // a superseded debounce timer must not write again
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await settle();
    expect(draftWrites(setItem)).toHaveLength(1);

    view.exitRoute();
    expect(appState.remove).toHaveBeenCalled();
  });

  test("restores a hydrated draft when Home mounts", async () => {
    const drafts = Storage.homeThoughtDraft(DistortionData, AsyncStorage);
    await drafts.write({
      spec: spec("restored from storage"),
      sourceRevision: 3,
      updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 0)),
      draftCleanup: null,
    });

    const view = await mounted();

    expect(view.getByTestId("automatic-thought-input").props.value).toBe(
      "restored from storage"
    );
    expect(draftWrites(setItem)).toHaveLength(0);
  });

  test("never re-presents a draft whose cleanup failed after a durable save", async () => {
    const submissionId = record(60, "pending").submissionId;
    await Storage.homeThoughtDraft(DistortionData, AsyncStorage).write({
      spec: spec("already saved as a thought"),
      sourceRevision: 6,
      updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 0)),
      draftCleanup: {
        status: "clear-failed",
        sourceRevision: 6,
        outboxSubmissionId: submissionId,
        lastError: "disk full",
        updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 1)),
      },
    });

    const view = await mounted();

    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");
    // the failure is still on disk and still surfaced, just not re-offered for saving
    expect(view.getByTestId("thought-save-recovery")).toBeTruthy();
    await expect(
      AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)
    ).resolves.not.toBeNull();
  });

  test("resets Home once the submission is durable, and cleans up the matching draft", async () => {
    const view = await mounted();
    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "submit me");
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await settle();
    expect(draftWrites(setItem)).toHaveLength(1);

    jest.useRealTimers();
    // Save lives on the last step of the flow
    for (let i = 0; i < 3; i++) {
      fireEvent.press(view.getByTestId("thought-entry-next"));
    }
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    // "A" alone resets Home; "B" clears the draft it was snapshotted from
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)).toBeNull()
    );
    for (let i = 0; i < 3; i++) {
      fireEvent.press(view.getByTestId("thought-entry-previous"));
    }
    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");
    const saved = await Storage.thoughts(DistortionData, AsyncStorage).readAll();
    expect(saved.thoughts.size).toBe(1);
    expect(
      Array.from(saved.thoughts.values())[0].automaticThought
    ).toBe("submit me");
  });

  test("discards the draft only after confirmation, leaving the outbox untouched", async () => {
    const drafts = Storage.homeThoughtDraft(DistortionData, AsyncStorage);
    await drafts.write({
      spec: spec("discard me"),
      sourceRevision: 4,
      updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 0)),
      draftCleanup: null,
    });
    const outbox = Storage.thoughtSaveOutbox(DistortionData, AsyncStorage);
    const pending = record(50, "pending");
    await outbox.insert(pending);

    const view = await mounted();

    fireEvent.press(view.getByTestId("discard-draft"));
    expect(view.getByTestId("discard-draft-confirm")).toBeTruthy();
    await settle();
    // read raw: the writers above cache their own last-known state
    await expect(AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)).resolves.not.toBeNull();

    await act(async () => {
      fireEvent.press(view.getByTestId("discard-draft-confirm"));
    });
    await settle();

    await expect(AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)).resolves.toBeNull();
    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");
    await expect(
      Storage.thoughtSaveOutbox(DistortionData, AsyncStorage).readAll()
    ).resolves.toEqual([pending]);
  });
});

test("Home displays restarted recovery records without labeling normal recovery as saved Thought cleanup", async () => {
  await AsyncStorage.clear();
  const records = [
    record(1, "insertion-pending"),
    record(2, "pending"),
    record(3, "uncertain"),
    record(4, "active"),
    record(5, "failed"),
    record(6, "cleanup-failed"),
    ...Array.from({ length: 14 }, (_, index) => record(index + 7, "pending")),
  ];
  const outbox = Storage.thoughtSaveOutbox(DistortionData, AsyncStorage);
  for (const item of records) await outbox.insert(item);
  const setItem = jest.spyOn(AsyncStorage, "setItem");
  setItem.mockClear();
  const view = renderHome();

  await waitFor(() => expect(view.getByTestId("thought-save-recovery")).toBeTruthy());

  expect(view.getByText("Recovery needed: recovery 2")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 3")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 4")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 5")).toBeTruthy();
  expect(view.getByText("Saved Thought cleanup needed: recovery 6")).toBeTruthy();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 2")).toBeNull();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 3")).toBeNull();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 5")).toBeNull();
  expect(setItem).not.toHaveBeenCalled();
  setItem.mockClear();
});
