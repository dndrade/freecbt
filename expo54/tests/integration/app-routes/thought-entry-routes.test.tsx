/**
 * @jest-environment jsdom
 */
import { Routes, Storage } from "@/src";
import Create from "@/src/app/v2/(public)/thoughts/create";
import Home from "@/src/app/v2/(public)/(tabs)/index";
import { ModelProvider } from "@/src/hooks/use-model";
import { DistortionData, Thought } from "@/src/model";
import { HOME_THOUGHT_DRAFT_KEY } from "@/src/platform/storage/home-thought-draft";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { BackHandler, Keyboard } from "react-native";
import { resetAsyncStorage } from "@/tests/support/async-storage";

const push = jest.fn();
const navigate = jest.fn();
const setOptions = jest.fn();
// stable across renders, like the real useRouter singleton: a fresh object every
// render would re-run every effect that depends on the router and hide bugs
const router = { push, navigate };
const navigation = { setOptions };

jest.mock("expo-router", () => ({
  useRouter: () => router,
  useNavigation: () => navigation,
  useFocusEffect: (effect: () => void | (() => void)) => {
    // effect is the caller-supplied callback itself, standing in for the real
    // useFocusEffect API shape; there are no deps to list here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(effect, []);
  },
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  ...jest.requireActual("@/src/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

// this file isn't about the save Toast; a real Toast render needs a
// `SafeAreaProvider` this harness doesn't have (HeroUI Native's Toast reads
// `useSafeAreaInsets()` directly), so keep it a no-op here.
jest.mock("heroui-native", () => ({
  ...jest.requireActual("heroui-native"),
  useToast: () => ({ toast: { show: jest.fn(), hide: jest.fn() } }),
}));

function Host(props: { children: React.ReactNode }) {
  return (
    <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
      <ModelProvider>{props.children}</ModelProvider>
    </HeroUINativeProvider>
  );
}

async function mount(screen: React.ReactNode) {
  const view = render(<Host>{screen}</Host>);
  await waitFor(() =>
    expect(view.getByTestId("automatic-thought-input")).toBeTruthy()
  );
  return view;
}

function toLastStep(view: ReturnType<typeof render>) {
  for (let i = 0; i < 3; i++) {
    fireEvent.press(view.getByTestId("thought-entry-next"));
  }
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

/** The last handler the staged-Back effect registered. */
function captureBack() {
  const handlers: (() => boolean)[] = [];
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_type, handler) => {
      handlers.push(handler as () => boolean);
      return { remove: () => {} } as never;
    });
  return () => handlers[handlers.length - 1];
}

/** Drive the keyboard-visibility listeners the staged-Back effect registers. */
function captureKeyboard() {
  const listeners = new Map<string, () => void>();
  jest.spyOn(Keyboard, "addListener").mockImplementation((event, handler) => {
    listeners.set(event, handler as () => void);
    return { remove: () => {} } as never;
  });
  return (event: "keyboardDidShow" | "keyboardDidHide") =>
    listeners.get(event)?.();
}

beforeEach(async () => {
  await resetAsyncStorage();
  push.mockClear();
  navigate.mockClear();
  setOptions.mockClear();
});

// AsyncStorage's jest mock is itself a jest.fn, so restoreAllMocks leaves it
// stripped of its implementation rather than restored: put it back by hand.
const realSetItem = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  (AsyncStorage.setItem as jest.Mock).mockImplementation(realSetItem);
});

async function seedHomeDraft(automaticThought: string) {
  await Storage.homeThoughtDraft(DistortionData, AsyncStorage).write({
    spec: { ...Thought.emptySpec(), automaticThought },
    sourceRevision: 1,
    updatedAt: new Date(Date.UTC(2026, 7, 11, 1, 0, 0)),
    draftCleanup: null,
  });
  return AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY);
}

describe("Home thought entry", () => {
  test("never navigates to the saved Thought after Save", async () => {
    const view = await mount(<Home />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "home stays home"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    await waitFor(async () =>
      expect(
        (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts
          .size
      ).toBe(1)
    );
    await settle();
    expect(push).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("hides the tabs once entry is focused and restores them on a pause", async () => {
    const view = await mount(<Home />);
    const tabBarStyle = () =>
      setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle;

    expect(tabBarStyle()).toBeUndefined();

    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "focused");
    expect(tabBarStyle()).toEqual({ display: "none" });

    // an internal control keeps focus
    fireEvent.press(view.getByTestId("thought-entry-next"));
    expect(tabBarStyle()).toEqual({ display: "none" });

    // interacting outside the entry surface pauses and gives the tabs back
    fireEvent.press(view.getByTestId("thought-entry-outside"));
    expect(tabBarStyle()).toBeUndefined();

    // returning to a control inside the flow takes focus again
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    expect(tabBarStyle()).toEqual({ display: "none" });
  });

  test("returns the tabs and the first step once a save is durable", async () => {
    const view = await mount(<Home />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "back to idle when this lands"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    await waitFor(async () =>
      expect(
        (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts
          .size
      ).toBe(1)
    );
    await settle();

    expect(
      setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle
    ).toBeUndefined();
    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");
    expect(view.queryByTestId("thought-entry-save")).toBeNull();
  });

  test("keeps the tabs visible when a restored draft is only sitting there", async () => {
    await seedHomeDraft("restored, not engaged");
    const view = await mount(<Home />);
    const tabBarStyle = () =>
      setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle;

    await waitFor(() =>
      expect(view.getByTestId("automatic-thought-input").props.value).toBe(
        "restored, not engaged"
      )
    );
    // a draft the app restored is data, not intentional engagement
    expect(tabBarStyle()).toBeUndefined();

    // ...and actually touching the flow still hides them
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "now I am engaged"
    );
    expect(tabBarStyle()).toEqual({ display: "none" });
  });

  test("hides the tabs when the user advances past the first step alone", async () => {
    const view = await mount(<Home />);
    fireEvent.press(view.getByTestId("thought-entry-next"));

    expect(
      setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle
    ).toEqual({ display: "none" });
  });

  test("stages platform Back: keyboard, then pause, then the platform", async () => {
    const back = captureBack();
    const keyboard = captureKeyboard();
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
    const view = await mount(<Home />);

    // idle: Back belongs to the platform
    expect(back()()).toBe(false);

    fireEvent.changeText(view.getByTestId("automatic-thought-input"), "typing");
    act(() => keyboard("keyboardDidShow"));

    // focused with the keyboard up: dismiss it and keep the entry state
    expect(back()()).toBe(true);
    expect(dismiss).toHaveBeenCalled();
    expect(
      setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle
    ).toEqual({ display: "none" });

    act(() => keyboard("keyboardDidHide"));

    // focused with the keyboard closed: pause, restoring the tabs
    let handledBack = false;
    act(() => {
      handledBack = back()();
    });
    expect(handledBack).toBe(true);
    await waitFor(() =>
      expect(
        setOptions.mock.calls[setOptions.mock.calls.length - 1][0].tabBarStyle
      ).toBeUndefined()
    );

    // paused: Back belongs to the platform again
    expect(back()()).toBe(false);
  });
});

describe("compatibility thought entry", () => {
  test("navigates to the saved Thought only once it is persisted", async () => {
    const view = await mount(<Create />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "compatibility save"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    // a healthy in-flight save is not a recovery situation
    expect(view.queryByTestId("home-thought-recovery")).toBeNull();

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const saved = Array.from(
      (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts.values()
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].automaticThought).toBe("compatibility save");
    expect(push).toHaveBeenCalledWith(Routes.thoughtViewV2(saved[0].uuid));
  });

  test("stays put when the Thought never reaches storage", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        key.startsWith(Thought.KEY_PREFIX)
          ? Promise.reject(new Error("disk full"))
          : realSetItem(key, value, cb)
      );

    const view = await mount(<Create />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "never persisted"
    );
    toLastStep(view);
    // nothing has failed yet, so nothing to recover from
    expect(view.queryByTestId("home-thought-recovery")).toBeNull();

    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    // the record is stuck for real: a failure-only surface, with Retry that
    // resumes this very submission rather than creating a second Thought
    await waitFor(() =>
      expect(view.getByTestId("home-thought-recovery")).toBeTruthy()
    );
    await settle();
    const [stuck] = await Storage.thoughtSaveOutbox(
      DistortionData,
      AsyncStorage
    ).readAll();
    expect(stuck.status).toBe("failed");
    expect(
      view.getByTestId(`home-thought-recovery-item-${stuck.submissionId}`)
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(
      (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts.size
    ).toBe(0);
    // and the user can try again: a failed save never latches Save shut
    expect(
      view.getByTestId("thought-entry-save").props.accessibilityState
    ).toMatchObject({ disabled: false });
  });

  test("Retry on the compatibility screen resumes the same submission", async () => {
    let failWrites = true;
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        failWrites && key.startsWith(Thought.KEY_PREFIX)
          ? Promise.reject(new Error("disk full"))
          : realSetItem(key, value, cb)
      );

    const view = await mount(<Create />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "retry me, do not duplicate me"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await waitFor(() =>
      expect(view.getByTestId("home-thought-recovery")).toBeTruthy()
    );
    const [stuck] = await Storage.thoughtSaveOutbox(
      DistortionData,
      AsyncStorage
    ).readAll();

    failWrites = false;
    await act(async () => {
      fireEvent.press(
        view.getByTestId(`home-thought-recovery-retry-${stuck.submissionId}`)
      );
    });
    await settle();

    const saved = Array.from(
      (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts.values()
    );
    // one user intent, one Thought: Retry resumes the stored submission instead
    // of minting a new one the way a second Save would
    expect(saved).toHaveLength(1);
    expect(saved[0].uuid).toBe(stuck.submissionId);
  });

  test("explains a full outbox instead of dropping the save silently", async () => {
    const outbox = Storage.thoughtSaveOutbox(DistortionData, AsyncStorage);
    for (let seed = 0; seed < 20; seed++) {
      const thought = Thought.create(
        { ...Thought.emptySpec(), automaticThought: `stuck ${seed}` },
        new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
      );
      await outbox.insert({
        submissionId: thought.uuid,
        thought,
        sourceDraftRevision: seed,
        attemptCount: 1,
        lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 10, seed)),
        lastError: "disk full",
        retryRequested: false,
        thoughtPersisted: false,
        updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 20, seed)),
        status: "failed",
      });
    }

    const view = await mount(<Create />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "no room for this one"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await settle();

    // its own copy, not the generic insertion failure
    expect(view.getByTestId("thought-entry-save-error")).toBeTruthy();
    expect(view.getByText("cbt_form.thought_save_capacity")).toBeTruthy();
    expect(view.queryByText("cbt_form.thought_save_failed")).toBeNull();
    // the editable input is left exactly as it was, Save still usable
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    expect(view.getByTestId("automatic-thought-input").props.value).toBe(
      "no room for this one"
    );
    // and the recovery surface is right there to resolve the backlog
    expect(view.getByTestId("home-thought-recovery")).toBeTruthy();
  });

  test("re-enables Save when the model rejects the submission outright", async () => {
    const view = await mount(<Create />);
    toLastStep(view);

    // an empty spec is never submitted, so the model state does not change at all
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await settle();

    expect(
      view.getByTestId("thought-entry-save").props.accessibilityState
    ).toMatchObject({ disabled: false });
    expect(view.queryByText("cbt_form.saving")).toBeNull();
  });

  test("saving here never touches Home's durable draft", async () => {
    const stored = await seedHomeDraft("home draft, still mine");
    const view = await mount(<Create />);

    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "saved from the compatibility screen"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    await settle();

    await expect(AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)).resolves.toBe(
      stored
    );
    view.unmount();

    const home = await mount(<Home />);
    expect(home.getByTestId("automatic-thought-input").props.value).toBe(
      "home draft, still mine"
    );
  });

  test("never shows or writes Home's durable draft", async () => {
    const stored = await seedHomeDraft("home draft, private to Home");
    const view = await mount(<Create />);

    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");

    jest.useFakeTimers();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "compatibility only"
    );
    await settle();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    jest.useRealTimers();

    await expect(AsyncStorage.getItem(HOME_THOUGHT_DRAFT_KEY)).resolves.toBe(
      stored
    );
    view.unmount();

    // and Home still restores exactly what it had
    const home = await mount(<Home />);
    expect(home.getByTestId("automatic-thought-input").props.value).toBe(
      "home draft, private to Home"
    );
  });
});
