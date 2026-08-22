import { ThoughtListScreen } from "@/features/thoughtRecord/screens/ThoughtListScreen";
import { ThoughtsLayout } from "@/features/thoughtRecord/screens/ThoughtsLayout";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { Thought } from "@/model";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { renderWithProviders } from "@/tests/support/render";

const mockReadAll = jest.fn();
let mockParams: { idOrKey?: string } = {};
let focusEffect: (() => void | (() => void)) | null = null;

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => null,
  useFocusEffect: (effect: () => void | (() => void)) => {
    focusEffect = effect;
    React.useEffect(() => effect(), [effect]);
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ readAll: mockReadAll })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<typeof ensureThoughtRecordReady>;

function thought(uuid: string, automaticThought: string, createdAt: Date): Thought.Thought {
  return Thought.Thought.decode({
    uuid,
    automaticThought,
    cognitiveDistortions: new Set(),
    challenge: "",
    alternativeThought: "",
    createdAt,
    updatedAt: createdAt,
  });
}

function history(overrides: Partial<React.ComponentProps<typeof ThoughtListScreen>["history"]> = {}) {
  return {
    thoughts: [],
    isLoading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReadAll.mockReset();
  mockParams = {};
  focusEffect = null;
});

test("shows a loading journal", () => {
  renderWithProviders(<ThoughtListScreen history={history({ isLoading: true })} />);
  expect(screen.getByTestId("thought-list-loading")).toBeTruthy();
});

test("shows a retryable journal error", () => {
  const retry = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(<ThoughtListScreen history={history({ error: new Error("offline"), refresh: retry })} />);
  expect(screen.getByTestId("thought-list-error")).toBeTruthy();
  fireEvent.press(screen.getByTestId("thought-list-retry"));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("shows an empty journal", () => {
  renderWithProviders(<ThoughtListScreen history={history()} />);
  expect(screen.getByText("cbt_list.empty")).toBeTruthy();
});

test("groups newest journal records by their creation date", () => {
  const newest = thought("00000000-0000-4000-8000-000000000001", "newest", new Date("2026-08-21T12:00:00Z"));
  const oldest = thought("00000000-0000-4000-8000-000000000002", "oldest", new Date("2026-08-20T12:00:00Z"));
  renderWithProviders(<ThoughtListScreen history={history({ thoughts: [oldest, newest] })} />);

  expect(screen.getByText("newest")).toBeTruthy();
  expect(screen.getByText("oldest")).toBeTruthy();
  expect(screen.getByText(newest.createdAt.toDateString())).toBeTruthy();
  expect(screen.getByText(oldest.createdAt.toDateString())).toBeTruthy();
});

test("refreshes the retained journal owner when the tab regains focus", async () => {
  const record = thought("00000000-0000-4000-8000-000000000003", "fresh after edit", new Date("2026-08-22T12:00:00Z"));
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([]).mockResolvedValueOnce([record]);
  renderWithProviders(<ThoughtsLayout />);

  await waitFor(() => expect(screen.getByText("cbt_list.empty")).toBeTruthy());
  expect(focusEffect).not.toBeNull();
  await act(async () => {
    focusEffect?.();
  });

  await waitFor(() => expect(screen.getByText("fresh after edit")).toBeTruthy());
  expect(thoughtsService).toHaveBeenCalledTimes(2);
});
