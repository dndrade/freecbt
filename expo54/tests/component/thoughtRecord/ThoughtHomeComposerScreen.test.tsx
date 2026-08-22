import { ThoughtHomeComposerScreen } from "@/features/thoughtRecord/screens/ThoughtHomeComposerScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { useThoughtWizardSession } from "@/features/thoughtRecord/store/useThoughtWizardSession";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { BackHandler } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

const setOptions = jest.fn();
const toastShow = jest.fn();
const write = jest.fn();
const values = new Map<string, string>();

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions }),
}));
jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ write })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));
jest.mock("heroui-native", () => ({
  ...jest.requireActual("heroui-native"),
  useToast: () => ({ toast: { show: toastShow, hide: jest.fn() } }),
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;
const service = thoughtsService as jest.MockedFunction<typeof thoughtsService>;

function render() {
  return renderWithProviders(<ThoughtHomeComposerScreen />);
}

function fillAndAdvance(automaticThought = "Keep this thought") {
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), automaticThought);
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
}

beforeEach(() => {
  jest.clearAllMocks();
  ready.mockResolvedValue({} as never);
  write.mockResolvedValue(undefined);
  jest.spyOn(useThoughtWizardSession.persist, "rehydrate").mockResolvedValue(undefined);
  act(() => useThoughtWizardSession.getState().reset());
});

afterEach(() => {
  values.clear();
  jest.restoreAllMocks();
});

test("waits for readiness before rehydrating the Home session", async () => {
  let resolveReady: (value: never) => void = () => undefined;
  ready.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveReady = resolve as (value: never) => void;
    })
  );
  const rehydrate = jest.spyOn(useThoughtWizardSession.persist, "rehydrate");

  render();

  expect(screen.queryByTestId("automatic-thought-input")).toBeNull();
  expect(rehydrate).not.toHaveBeenCalled();
  await act(async () => resolveReady({} as never));

  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());
  expect(rehydrate).toHaveBeenCalledTimes(1);
});

test("keeps a restored later slide focused until staged Back pauses Home", async () => {
  const handlers: (() => boolean)[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
    handlers.push(handler as () => boolean);
    return { remove: jest.fn() } as never;
  });
  act(() => useThoughtWizardSession.setState({
    currentSlide: "challenge",
    automaticThought: "I made a mistake",
    challenge: "One moment does not define me",
  }));

  render();

  await waitFor(() => expect(screen.getByTestId("challenge-input")).toBeTruthy());
  expect(setOptions.mock.calls.at(-1)?.[0].tabBarStyle).toEqual({ display: "none" });
  let handled = false;
  act(() => {
    handled = handlers.at(-1)?.() ?? false;
  });
  expect(handled).toBe(true);
  await waitFor(() => expect(setOptions.mock.calls.at(-1)?.[0].tabBarStyle).toBeUndefined());
});

test("shows a success toast and resets Home after a direct save", async () => {
  render();
  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());

  fillAndAdvance();
  fireEvent.press(screen.getByTestId("thought-entry-save"));

  await waitFor(() => expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({
    variant: "success",
    label: "cbt_form.thought_saved",
  })));
  expect(service).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("automatic-thought-input").props.value).toBe("");
  expect(screen.queryByTestId("thought-entry-save")).toBeNull();
});

test("keeps a failed save draft available to retry", async () => {
  write.mockRejectedValueOnce(new Error("write failed")).mockResolvedValueOnce(undefined);
  render();
  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());

  fillAndAdvance("Do not lose this");
  fireEvent.press(screen.getByTestId("thought-entry-save"));

  await waitFor(() => expect(screen.getByTestId("thought-entry-save-error")).toBeTruthy());
  expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({
    variant: "danger",
    label: "cbt_form.thought_save_failed",
  }));
  expect(useThoughtWizardSession.getState().automaticThought).toBe("Do not lose this");

  fireEvent.press(screen.getByTestId("thought-entry-retry"));
  await waitFor(() => expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({
    variant: "success",
    label: "cbt_form.thought_saved",
  })));
});

test("suppresses a duplicate Save while the direct write is pending", async () => {
  let resolveWrite: () => void = () => undefined;
  write.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveWrite = resolve;
    })
  );
  render();
  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());

  fillAndAdvance("Save only once");
  fireEvent.press(screen.getByTestId("thought-entry-save"));
  fireEvent.press(screen.getByTestId("thought-entry-save"));

  await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  await act(async () => resolveWrite());
  await waitFor(() => expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" })));
});

test("keeps the Home draft when discard confirmation is cancelled", async () => {
  render();
  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());

  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "Keep this draft");
  fireEvent.press(screen.getByTestId("discard-draft"));
  expect(screen.getByTestId("discard-draft-confirmation")).toBeTruthy();
  fireEvent.press(screen.getByTestId("discard-draft-cancel"));

  expect(screen.queryByTestId("discard-draft-confirmation")).toBeNull();
  expect(screen.getByTestId("automatic-thought-input").props.value).toBe("Keep this draft");
});
