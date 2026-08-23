import { Routes } from "@/src";
import { ThoughtEditScreen } from "@/features/thoughtRecord/screens/ThoughtEditScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { Thought } from "@/model";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";
import { Pressable } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

const mockReplace = jest.fn();
const mockRead = jest.fn();
const mockWrite = jest.fn();
let mockParams: { idOrKey?: string; slide?: string } = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({ setOptions: jest.fn() }),
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ read: mockRead, write: mockWrite })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;

function thought(uuid: string, automaticThought: string): Thought.Thought {
  return Thought.Thought.decode({
    uuid,
    automaticThought,
    cognitiveDistortions: new Set(),
    challenge: "",
    alternativeThought: "",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
}

function render() {
  function RouteHarness() {
    const [, forceRender] = React.useState(0);
    return (
      <>
        <Pressable
          testID="refresh-route"
          onPress={() => forceRender((n) => n + 1)}
        />
        <ThoughtEditScreen />
      </>
    );
  }
  return renderWithProviders(<RouteHarness />);
}

function save() {
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-save"));
}

beforeEach(() => {
  jest.clearAllMocks();
  ready.mockReset();
  mockRead.mockReset();
  mockWrite.mockReset();
  mockParams = {};
});

afterEach(cleanup);

test("loads a valid route ID only after readiness", async () => {
  const record = thought("00000000-0000-4000-8000-000000000001", "loaded");
  mockParams = { idOrKey: record.uuid };
  let resolveReady: (value: never) => void = () => undefined;
  ready.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveReady = resolve as (value: never) => void;
    }),
  );
  mockRead.mockResolvedValueOnce(record);
  render();

  expect(mockRead).not.toHaveBeenCalled();
  await act(async () => resolveReady({} as never));
  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input").props.value).toBe(
      "loaded",
    ),
  );
  expect(mockRead).toHaveBeenCalledWith(record.uuid);
});

test("retries a missing or unreadable record", async () => {
  const id = Thought.Id.decode("00000000-0000-4000-8000-000000000002");
  mockParams = { idOrKey: id };
  ready.mockResolvedValue({} as never);
  mockRead
    .mockRejectedValueOnce(new Error("no such thought-id"))
    .mockResolvedValueOnce(thought(id, "recovered"));
  render();

  await waitFor(() =>
    expect(screen.getByTestId("thought-edit-error")).toBeTruthy(),
  );
  expect(screen.getByText("cbt_form.thought_load_failed")).toBeTruthy();
  fireEvent.press(screen.getByTestId("thought-edit-retry"));

  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input").props.value).toBe(
      "recovered",
    ),
  );
});

test("ignores a stale read after the route ID changes", async () => {
  const first = thought("00000000-0000-4000-8000-000000000003", "stale");
  const second = thought("00000000-0000-4000-8000-000000000004", "current");
  let resolveFirst: (value: Thought.Thought) => void = () => undefined;
  const firstRead = new Promise<Thought.Thought>((resolve) => {
    resolveFirst = resolve;
  });
  mockParams = { idOrKey: first.uuid };
  ready.mockResolvedValue({} as never);
  mockRead
    .mockImplementationOnce(() => firstRead)
    .mockResolvedValueOnce(second);
  render();

  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
  mockParams = { idOrKey: second.uuid };
  fireEvent.press(screen.getByTestId("refresh-route"));
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(2));
  await act(async () => resolveFirst(first));

  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input").props.value).toBe(
      "current",
    ),
  );
  expect(screen.queryByDisplayValue("stale")).toBeNull();
});

test("does not start a read when readiness resolves after unmount", async () => {
  const record = thought("00000000-0000-4000-8000-000000000007", "hidden");
  let resolveReady: (value: never) => void = () => undefined;
  mockParams = { idOrKey: record.uuid };
  ready.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveReady = resolve as (value: never) => void;
    }),
  );
  mockRead.mockResolvedValueOnce(record);
  const view = render();

  view.unmount();
  await act(async () => resolveReady({} as never));

  expect(mockRead).not.toHaveBeenCalled();
});

test("resets a loaded edit form when its requested slide changes", async () => {
  const record = thought("00000000-0000-4000-8000-000000000005", "loaded");
  mockParams = { idOrKey: record.uuid, slide: "challenge" };
  ready.mockResolvedValueOnce({} as never);
  mockRead.mockResolvedValueOnce(record);
  render();

  await waitFor(() =>
    expect(screen.getByTestId("challenge-input")).toBeTruthy(),
  );
  mockParams = { idOrKey: record.uuid, slide: "distortions" };
  fireEvent.press(screen.getByTestId("refresh-route"));

  await waitFor(() =>
    expect(screen.getByTestId("distortions-step")).toBeTruthy(),
  );
});

test("preserves identity while updating and replaces after save", async () => {
  const record = thought("00000000-0000-4000-8000-000000000006", "before");
  mockParams = { idOrKey: record.uuid };
  ready.mockResolvedValueOnce({} as never);
  mockRead.mockResolvedValueOnce(record);
  mockWrite.mockResolvedValueOnce(undefined);
  render();

  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy(),
  );
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "after");
  save();

  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith(Routes.thoughtViewV2(record.uuid)),
  );
  expect(mockWrite).toHaveBeenCalledWith(
    expect.objectContaining({
      uuid: record.uuid,
      createdAt: record.createdAt,
      automaticThought: "after",
    }),
  );
  expect(mockWrite.mock.calls[0][0].updatedAt).not.toEqual(record.updatedAt);
});

test("does not replace after a successful write resolves after unmount", async () => {
  const record = thought("00000000-0000-4000-8000-000000000008", "before");
  mockParams = { idOrKey: record.uuid };
  ready.mockResolvedValueOnce({} as never);
  mockRead.mockResolvedValueOnce(record);
  let resolveWrite: () => void = () => undefined;
  mockWrite.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveWrite = resolve;
    }),
  );
  const view = render();

  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy(),
  );
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "after");
  save();
  await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => resolveWrite());

  expect(mockReplace).not.toHaveBeenCalled();
});
