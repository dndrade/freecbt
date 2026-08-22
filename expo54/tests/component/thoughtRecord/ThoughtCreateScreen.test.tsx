import { Routes } from "@/src";
import { ThoughtCreateScreen } from "@/features/thoughtRecord/screens/ThoughtCreateScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { renderWithProviders } from "@/tests/support/render";

const mockReplace = jest.fn();
const mockWrite = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ write: mockWrite })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;
const service = thoughtsService as jest.MockedFunction<typeof thoughtsService>;

function render() {
  return renderWithProviders(<ThoughtCreateScreen />);
}

function enterAutomaticThought(value = "Keep this thought") {
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), value);
}

function save() {
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-save"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(cleanup);

test("writes the local form and replaces with its saved thought", async () => {
  ready.mockResolvedValueOnce({} as never);
  mockWrite.mockResolvedValueOnce(undefined);
  render();

  enterAutomaticThought();
  save();

  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  const thought = mockWrite.mock.calls[0][0];
  expect(service).toHaveBeenCalledTimes(1);
  expect(thought.automaticThought).toBe("Keep this thought");
  expect(mockReplace).toHaveBeenCalledWith(Routes.thoughtViewV2(thought.uuid));
});

test("does not write an empty standalone thought", () => {
  render();

  save();

  expect(ready).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByTestId("thought-entry-save").props.accessibilityState).toMatchObject({
    disabled: false,
  });
});

test("does not replace after a successful write resolves after unmount", async () => {
  ready.mockResolvedValueOnce({} as never);
  let resolveWrite: () => void = () => undefined;
  mockWrite.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveWrite = resolve;
    })
  );
  const view = render();

  enterAutomaticThought();
  save();
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => resolveWrite());

  expect(mockReplace).not.toHaveBeenCalled();
});

test("retains input and retries a failed write inline", async () => {
  ready.mockRejectedValueOnce(new Error("database unavailable"));
  ready.mockResolvedValueOnce({} as never);
  mockWrite.mockResolvedValueOnce(undefined);
  render();

  enterAutomaticThought("Do not lose this");
  save();

  await waitFor(() => expect(screen.getByTestId("thought-entry-save-error")).toBeTruthy());
  fireEvent.press(screen.getByTestId("thought-entry-previous"));
  fireEvent.press(screen.getByTestId("thought-entry-previous"));
  fireEvent.press(screen.getByTestId("thought-entry-previous"));
  expect(screen.getByTestId("automatic-thought-input").props.value).toBe(
    "Do not lose this"
  );

  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-retry"));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
});
