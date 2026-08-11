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

const push = jest.fn();
const navigate = jest.fn();
const setOptions = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push, navigate }),
  useNavigation: () => ({ setOptions }),
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  ...jest.requireActual("@/src/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

function Host(props: { children: React.ReactNode }) {
  return (
    <HeroUINativeProvider>
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
  await AsyncStorage.clear();
  push.mockClear();
  navigate.mockClear();
  setOptions.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
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
    expect(back()()).toBe(true);
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

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const saved = Array.from(
      (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts.values()
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].automaticThought).toBe("compatibility save");
    expect(push).toHaveBeenCalledWith(Routes.thoughtViewV2(saved[0].uuid));
  });

  test("stays put when the Thought never reaches storage", async () => {
    const setItem = AsyncStorage.setItem as jest.Mock;
    const real = setItem.getMockImplementation()!;
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockImplementation((key, value, cb) =>
        key.startsWith(Thought.KEY_PREFIX)
          ? Promise.reject(new Error("disk full"))
          : real(key, value, cb)
      );

    const view = await mount(<Create />);
    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "never persisted"
    );
    toLastStep(view);
    await act(async () => {
      fireEvent.press(view.getByTestId("thought-entry-save"));
    });

    await waitFor(() =>
      expect(view.getByTestId("thought-save-recovery")).toBeTruthy()
    );
    await settle();
    expect(push).not.toHaveBeenCalled();
    expect(
      (await Storage.thoughts(DistortionData, AsyncStorage).readAll()).thoughts.size
    ).toBe(0);
  });

  test("never shows or writes Home's durable draft", async () => {
    const stored = await seedHomeDraft("home draft, private to Home");
    const view = await mount(<Create />);

    expect(view.getByTestId("automatic-thought-input").props.value).toBe("");

    fireEvent.changeText(
      view.getByTestId("automatic-thought-input"),
      "compatibility only"
    );
    await settle();
    await act(async () => {
      jest.advanceTimersByTime?.(2000);
    });

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
