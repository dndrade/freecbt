import { ThoughtViewScreen } from "@/features/thoughtRecord/screens/ThoughtViewScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { Thought } from "@/model";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Pressable } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

const mockRead = jest.fn();
let mockParams: { idOrKey?: string } = {};

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ read: mockRead })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<typeof ensureThoughtRecordReady>;

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
        <Pressable testID="refresh-route" onPress={() => forceRender((n) => n + 1)} />
        <ThoughtViewScreen />
      </>
    );
  }
  return renderWithProviders(<RouteHarness />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRead.mockReset();
  mockParams = {};
});

afterEach(cleanup);

test("waits for readiness and ignores a stale detail read after a route change", async () => {
  const first = thought("00000000-0000-4000-8000-000000000011", "stale detail");
  const second = thought("00000000-0000-4000-8000-000000000012", "current detail");
  let resolveFirst: (value: Thought.Thought) => void = () => undefined;
  const firstRead = new Promise<Thought.Thought>((resolve) => {
    resolveFirst = resolve;
  });
  mockParams = { idOrKey: first.uuid };
  ready.mockResolvedValue({} as never);
  mockRead.mockImplementationOnce(() => firstRead).mockResolvedValueOnce(second);
  render();

  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
  mockParams = { idOrKey: second.uuid };
  fireEvent.press(screen.getByTestId("refresh-route"));
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(2));
  await act(async () => resolveFirst(first));

  await waitFor(() => expect(screen.getByText("current detail")).toBeTruthy());
  expect(screen.queryByText("stale detail")).toBeNull();
});

test("shows a retryable error for an unreadable route", async () => {
  const record = thought("00000000-0000-4000-8000-000000000013", "recovered detail");
  mockParams = { idOrKey: record.uuid };
  ready.mockResolvedValue({} as never);
  mockRead.mockRejectedValueOnce(new Error("missing")).mockResolvedValueOnce(record);
  render();

  await waitFor(() => expect(screen.getByTestId("thought-view-error")).toBeTruthy());
  fireEvent.press(screen.getByTestId("thought-view-retry"));

  await waitFor(() => expect(screen.getByText("recovered detail")).toBeTruthy());
});
