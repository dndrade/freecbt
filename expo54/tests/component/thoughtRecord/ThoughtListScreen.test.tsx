import { ThoughtListScreen } from "@/features/thoughtRecord/screens/ThoughtListScreen";
import { ThoughtsLayout } from "@/features/thoughtRecord/screens/ThoughtsLayout";
import ThoughtListRoute from "@/app/v2/(public)/(tabs)/thoughts";
import { ThoughtCreateScreen } from "@/features/thoughtRecord/screens/ThoughtCreateScreen";
import { ThoughtEditScreen } from "@/features/thoughtRecord/screens/ThoughtEditScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { Thought } from "@/model";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Pressable } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

const mockReadAll = jest.fn();
const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockReplace = jest.fn();
const mockRouteContext = React.createContext<"thoughts" | "create" | "edit">("thoughts");
let mockParams: { idOrKey?: string } = {};
let route: "thoughts" | "create" | "edit" = "thoughts";
let rerenderRoute: () => void = () => undefined;

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => null,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const focusedRoute = React.useContext(mockRouteContext);
    React.useEffect(() => focusedRoute === "thoughts" ? effect() : undefined, [effect, focusedRoute]);
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: jest.fn(),
    replace: (href: { params?: { idOrKey?: string } }) => {
      mockReplace(href);
      mockParams = { idOrKey: href.params?.idOrKey };
      route = "thoughts";
      rerenderRoute();
    },
  }),
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ readAll: mockReadAll, read: mockRead, write: mockWrite })),
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
  mockRead.mockReset();
  mockWrite.mockReset();
  mockParams = {};
  route = "thoughts";
  rerenderRoute = () => undefined;
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

test("leaves history ownership to the retained layout", async () => {
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([]);
  renderWithProviders(<ThoughtListRoute />);
  await waitFor(() => expect(screen.queryByTestId("thought-list-loading")).toBeNull());
  expect(screen.queryByText("cbt_list.empty")).toBeNull();
});

function NavigationHarness() {
  const [, setVersion] = React.useState(0);
  rerenderRoute = () => setVersion((version) => version + 1);
  return (
    <mockRouteContext.Provider value={route}>
      <ThoughtsLayout />
      <Pressable testID="open-create" onPress={() => { route = "create"; rerenderRoute(); }} />
      <Pressable testID="open-edit" onPress={() => { route = "edit"; mockParams = { idOrKey: "00000000-0000-4000-8000-000000000004" }; rerenderRoute(); }} />
      {route === "create" ? <ThoughtCreateScreen /> : null}
      {route === "edit" ? <ThoughtEditScreen /> : null}
    </mockRouteContext.Provider>
  );
}

function save() {
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-next"));
  fireEvent.press(screen.getByTestId("thought-entry-save"));
}

function showWideJournal() {
  fireEvent(screen.getByTestId("adaptive-thoughts-layout"), "layout", {
    nativeEvent: { layout: { width: 1000, height: 700 } },
  });
}

test("refreshes the retained journal after a create returns to the selected thought", async () => {
  const record = thought("00000000-0000-4000-8000-000000000003", "fresh after create", new Date("2026-08-22T12:00:00Z"));
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([]).mockResolvedValueOnce([record]);
  mockWrite.mockResolvedValueOnce(undefined);
  renderWithProviders(<NavigationHarness />);

  await waitFor(() => expect(screen.getByText("cbt_list.empty")).toBeTruthy());
  fireEvent.press(screen.getByTestId("open-create"));
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "fresh after create");
  save();
  showWideJournal();

  await waitFor(() => expect(screen.getByText("fresh after create")).toBeTruthy());
});

test("refreshes the retained journal after an edit returns to the selected thought", async () => {
  const before = thought("00000000-0000-4000-8000-000000000004", "before edit", new Date("2026-08-22T12:00:00Z"));
  const after = thought(before.uuid, "after edit", before.createdAt);
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([before]).mockResolvedValueOnce([after]);
  mockRead.mockResolvedValueOnce(before);
  mockWrite.mockResolvedValueOnce(undefined);
  renderWithProviders(<NavigationHarness />);

  await waitFor(() => expect(screen.getByText("before edit")).toBeTruthy());
  fireEvent.press(screen.getByTestId("open-edit"));
  await waitFor(() => expect(screen.getByTestId("automatic-thought-input")).toBeTruthy());
  fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "after edit");
  save();
  showWideJournal();

  await waitFor(() => expect(screen.getByText("after edit")).toBeTruthy());
});
