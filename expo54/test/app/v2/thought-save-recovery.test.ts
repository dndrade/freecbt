/**
 * @jest-environment jsdom
 */
import { Storage } from "@/src";
import Home from "@/src/app/v2/(public)/(tabs)/index";
import { ModelProvider } from "@/src/hooks/use-model";
import { DistortionData, Thought } from "@/src/model";
import { THOUGHT_SAVE_OUTBOX_KEY } from "@/src/platform/storage/thought-save-outbox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";

const push = jest.fn();
const navigate = jest.fn();
const setOptions = jest.fn();
const router = { push, navigate };
const navigation = { setOptions };

jest.mock("expo-router", () => ({
  useRouter: () => router,
  useNavigation: () => navigation,
  useFocusEffect: (effect: () => void | (() => void)) => {
    React.useEffect(effect, []);
  },
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  ...jest.requireActual("@/src/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

// A real Toast render needs a `SafeAreaProvider` this harness doesn't set up
// (HeroUI Native's Toast reads `useSafeAreaInsets()` directly), and rendering
// through the animated Toast stack is unrelated to what this file verifies -
// capture calls instead and trust the library's own show/hide/auto-dismiss
// behavior, per Task 9's brief.
const toastShow = jest.fn();
jest.mock("heroui-native", () => ({
  ...jest.requireActual("heroui-native"),
  useToast: () => ({ toast: { show: toastShow, hide: jest.fn() } }),
}));

function HomeHost() {
  return React.createElement(
    HeroUINativeProvider,
    null,
    React.createElement(ModelProvider, null, React.createElement(Home))
  );
}

async function mount() {
  const view = render(React.createElement(HomeHost));
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

// AsyncStorage's jest mock is itself a jest.fn, so restoreAllMocks leaves it
// stripped of its implementation rather than restored: put it back by hand.
const realSetItem = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;

beforeEach(async () => {
  await AsyncStorage.clear();
  toastShow.mockClear();
  push.mockClear();
  navigate.mockClear();
  setOptions.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  (AsyncStorage.setItem as jest.Mock).mockImplementation(realSetItem);
});

describe("Home save Toast + recovery wiring", () => {
  test("shows a transient success Toast, with a check icon, after a confirmed Home save", async () => {
    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "toast me on save"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    const [config] = toastShow.mock.calls[0];
    expect(config).toMatchObject({
      variant: "success",
      label: "cbt_form.thought_saved",
    });
    expect(config.icon).toBeTruthy();
    // transient: no explicit persistent duration override - the library's own
    // default (a few seconds) applies
    expect(config.duration).not.toBe("persistent");
  });

  test("shows an immediate failure Toast when outbox insertion itself is rejected", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        key === THOUGHT_SAVE_OUTBOX_KEY
          ? Promise.reject(new Error("disk full"))
          : realSetItem(key, value, cb)
      );

    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "never even queued"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    expect(toastShow.mock.calls[0][0]).toMatchObject({
      variant: "danger",
      label: "cbt_form.thought_save_failed",
    });
    // a rejected insertion never resets Home: Save stays usable, not latched
    await settle();
    expect(
      view.getByTestId("thought-entry-save").props.accessibilityState
    ).toMatchObject({ disabled: false });
    // rejected outright, so there is nothing durable left to recover either
    expect(view.queryByTestId("home-thought-recovery")).toBeNull();
  });

  test("a later write failure surfaces only through the durable recovery banner, never a second Toast", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        key.startsWith(Thought.KEY_PREFIX)
          ? Promise.reject(new Error("disk full"))
          : realSetItem(key, value, cb)
      );

    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "queued, then stuck"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    // outbox insertion durably succeeded, so Home already reset and already
    // showed its one success Toast...
    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    expect(toastShow.mock.calls[0][0]).toMatchObject({ variant: "success" });

    // ...and the later write failure shows up as the durable banner instead
    await waitFor(() =>
      expect(view.getByTestId("home-thought-recovery")).toBeTruthy()
    );
    await settle();
    // never a second (failure) Toast for the same submission
    expect(toastShow).toHaveBeenCalledTimes(1);
  });

  test("a failed durable outbox update stays recoverable and never wedges the outbox", async () => {
    let outboxWrites = 0;
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) => {
        if (key === THOUGHT_SAVE_OUTBOX_KEY) {
          outboxWrites += 1;
          // 1 is the insertion; 2 is the transition to `active` - the write
          // whose failure used to leave the record `active` forever, invisible
          // to every recovery filter and blocking every later record.
          if (outboxWrites === 2) {
            return Promise.reject(new Error("disk full"));
          }
        }
        return realSetItem(key, value, cb);
      });

    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "stuck mid-flight"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    // recoverable, with a usable Retry - not an invisible `active` record
    await waitFor(() =>
      expect(view.getByTestId("home-thought-recovery")).toBeTruthy()
    );
    await settle();
    expect(
      view.getByTestId(/^home-thought-recovery-retry-/).props
        .accessibilityState
    ).toMatchObject({ disabled: false });

    // and the processor still runs: a later submission saves normally
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "the next one still saves"
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

    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "no room for this one"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await settle();

    expect(toastShow).toHaveBeenCalledTimes(1);
    expect(toastShow.mock.calls[0][0]).toMatchObject({
      variant: "danger",
      // distinct from the generic insertion failure: nothing was attempted
      label: "cbt_form.thought_save_capacity",
    });
    // the editable input is never cleared or reset by a capacity rejection...
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    fireEvent.press(view.getByTestId("thought-entry-previous"));
    expect(view.getByTestId("automatic-thought-input").props.value).toBe(
      "no room for this one"
    );
    // ...and the recovery surface is right there to resolve the backlog
    expect(view.getByTestId("home-thought-recovery")).toBeTruthy();
  });

  test("never sets a tab badge", async () => {
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        key.startsWith(Thought.KEY_PREFIX)
          ? Promise.reject(new Error("disk full"))
          : realSetItem(key, value, cb)
      );

    const view = await mount();
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "no badge please"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });
    await waitFor(() =>
      expect(view.getByTestId("home-thought-recovery")).toBeTruthy()
    );
    await settle();

    expect(setOptions.mock.calls.length).toBeGreaterThan(0);
    for (const [options] of setOptions.mock.calls) {
      expect(options).not.toHaveProperty("tabBarBadge");
    }
  });
});
