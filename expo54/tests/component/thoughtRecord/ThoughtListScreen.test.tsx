import { ThoughtListScreen } from "@/features/thoughtRecord/screens/ThoughtListScreen";
import { ThoughtsLayout } from "@/features/thoughtRecord/screens/ThoughtsLayout";
import ThoughtListRoute from "@/app/v2/(public)/(tabs)/thoughts";
import { ThoughtCreateScreen } from "@/features/thoughtRecord/screens/ThoughtCreateScreen";
import { ThoughtEditScreen } from "@/features/thoughtRecord/screens/ThoughtEditScreen";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { Thought } from "@/model";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

const mockReadAll = jest.fn();
const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockRemove = jest.fn();
const mockReplace = jest.fn();
const mockRouteContext = React.createContext<"thoughts" | "create" | "edit">(
  "thoughts",
);
let mockParams: { idOrKey?: string } = {};
let route: "thoughts" | "create" | "edit" = "thoughts";
let rerenderRoute: () => void = () => undefined;

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Slot: () => (
    <Text testID="selected-thought-detail">selected thought detail</Text>
  ),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const focusedRoute = React.useContext(mockRouteContext);
    React.useEffect(
      () => (focusedRoute === "thoughts" ? effect() : undefined),
      [effect, focusedRoute],
    );
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: jest.fn(),
    replace: (href: string | { params?: { idOrKey?: string } }) => {
      mockReplace(href);
      mockParams = {
        idOrKey: typeof href === "string" ? undefined : href.params?.idOrKey,
      };
      route = "thoughts";
      rerenderRoute();
    },
  }),
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({
    readAll: mockReadAll,
    read: mockRead,
    write: mockWrite,
    remove: mockRemove,
  })),
}));
jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;

function thought(
  uuid: string,
  automaticThought: string,
  createdAt: Date,
): Thought.Thought {
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

function history(
  overrides: Partial<
    React.ComponentProps<typeof ThoughtListScreen>["history"]
  > = {},
) {
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
  mockRemove.mockReset();
  mockParams = {};
  route = "thoughts";
  rerenderRoute = () => undefined;
});

test("shows a loading journal", () => {
  renderWithProviders(
    <ThoughtListScreen history={history({ isLoading: true })} />,
  );
  expect(screen.getByTestId("thought-list-loading")).toBeTruthy();
});

test("shows a retryable journal error", () => {
  const retry = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <ThoughtListScreen
      history={history({ error: new Error("offline"), refresh: retry })}
    />,
  );
  expect(screen.getByTestId("thought-list-error")).toBeTruthy();
  fireEvent.press(screen.getByTestId("thought-list-retry"));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("shows an empty journal", () => {
  renderWithProviders(<ThoughtListScreen history={history()} />);
  expect(screen.getByText("cbt_list.empty")).toBeTruthy();
});

test("groups newest journal records by their creation date", () => {
  const newest = thought(
    "00000000-0000-4000-8000-000000000001",
    "newest",
    new Date("2026-08-21T12:00:00Z"),
  );
  const oldest = thought(
    "00000000-0000-4000-8000-000000000002",
    "oldest",
    new Date("2026-08-20T12:00:00Z"),
  );
  renderWithProviders(
    <ThoughtListScreen history={history({ thoughts: [oldest, newest] })} />,
  );

  expect(screen.getByText("newest")).toBeTruthy();
  expect(screen.getByText("oldest")).toBeTruthy();
  expect(screen.getByText(newest.createdAt.toDateString())).toBeTruthy();
  expect(screen.getByText(oldest.createdAt.toDateString())).toBeTruthy();
});

test("confirms a journal deletion and lets it be cancelled", () => {
  const record = thought(
    "00000000-0000-4000-8000-000000000005",
    "keep this",
    new Date("2026-08-22T12:00:00Z"),
  );
  renderWithProviders(
    <ThoughtListScreen history={history({ thoughts: [record] })} />,
  );

  fireEvent.press(screen.getByLabelText("accessibility.delete_thought_button"));
  expect(
    screen.getByTestId(`thought-delete-confirmation-${record.uuid}`),
  ).toBeTruthy();
  expect(screen.getByText("thought_delete.confirm")).toBeTruthy();
  expect(screen.getByText("thought_delete.delete")).toBeTruthy();
  expect(screen.getByText("thought_delete.cancel")).toBeTruthy();
  fireEvent.press(screen.getByTestId(`thought-delete-cancel-${record.uuid}`));

  expect(
    screen.queryByTestId(`thought-delete-confirmation-${record.uuid}`),
  ).toBeNull();
  expect(screen.getByText("keep this")).toBeTruthy();
  expect(mockRemove).not.toHaveBeenCalled();
});

test("removes a confirmed journal record and refreshes the shared history", async () => {
  const record = thought(
    "00000000-0000-4000-8000-000000000006",
    "remove this",
    new Date("2026-08-22T12:00:00Z"),
  );
  let resolveRemove: () => void = () => undefined;
  mockRemove.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolveRemove = resolve;
    }),
  );
  const refresh = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <ThoughtListScreen history={history({ thoughts: [record], refresh })} />,
  );

  fireEvent.press(screen.getByLabelText("accessibility.delete_thought_button"));
  fireEvent.press(screen.getByTestId(`thought-delete-confirm-${record.uuid}`));

  expect(
    screen.getByTestId(`thought-delete-confirm-${record.uuid}`).props
      .accessibilityState,
  ).toMatchObject({ disabled: true });
  expect(
    screen.getByTestId(`thought-delete-cancel-${record.uuid}`).props
      .accessibilityState,
  ).toMatchObject({ disabled: true });
  resolveRemove();

  await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(record.uuid));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});

test("keeps a journal record and offers Retry when deletion fails", async () => {
  const record = thought(
    "00000000-0000-4000-8000-000000000007",
    "retry this",
    new Date("2026-08-22T12:00:00Z"),
  );
  mockRemove
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  const refresh = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <ThoughtListScreen history={history({ thoughts: [record], refresh })} />,
  );

  fireEvent.press(screen.getByLabelText("accessibility.delete_thought_button"));
  fireEvent.press(screen.getByTestId(`thought-delete-confirm-${record.uuid}`));

  await waitFor(() =>
    expect(
      screen.getByTestId(`thought-delete-retry-${record.uuid}`),
    ).toBeTruthy(),
  );
  expect(screen.getByText("thought_delete.failed")).toBeTruthy();
  expect(screen.getByText("cbt_form.retry")).toBeTruthy();
  expect(screen.getByText("retry this")).toBeTruthy();
  fireEvent.press(screen.getByTestId(`thought-delete-retry-${record.uuid}`));

  await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});

function LastRowHarness({ record }: { record: Thought.Thought }) {
  const [thoughts, setThoughts] = React.useState<readonly Thought.Thought[]>([
    record,
  ]);
  return (
    <ThoughtListScreen
      history={history({ thoughts, refresh: async () => setThoughts([]) })}
    />
  );
}

test("shows the empty journal after its last record is removed", async () => {
  const record = thought(
    "00000000-0000-4000-8000-000000000008",
    "last record",
    new Date("2026-08-22T12:00:00Z"),
  );
  mockRemove.mockResolvedValueOnce(undefined);
  renderWithProviders(<LastRowHarness record={record} />);

  fireEvent.press(screen.getByLabelText("accessibility.delete_thought_button"));
  fireEvent.press(screen.getByTestId(`thought-delete-confirm-${record.uuid}`));

  await waitFor(() => expect(screen.getByText("cbt_list.empty")).toBeTruthy());
});

test("clears a selected wide-pane detail after deleting its thought", async () => {
  const record = thought(
    "00000000-0000-4000-8000-000000000009",
    "selected record",
    new Date("2026-08-22T12:00:00Z"),
  );
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([record]).mockResolvedValueOnce([]);
  mockRemove.mockResolvedValueOnce(undefined);
  mockParams = { idOrKey: record.uuid };
  renderWithProviders(<NavigationHarness />);

  showWideJournal();
  await waitFor(() => expect(screen.getByText("selected record")).toBeTruthy());
  expect(screen.getByTestId("selected-thought-detail")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("accessibility.delete_thought_button"));
  fireEvent.press(screen.getByTestId(`thought-delete-confirm-${record.uuid}`));

  await waitFor(() =>
    expect(screen.queryByTestId("selected-thought-detail")).toBeNull(),
  );
  expect(screen.getByText("cbt_list.empty")).toBeTruthy();
});

test("leaves history ownership to the retained layout", async () => {
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([]);
  renderWithProviders(<ThoughtListRoute />);
  await waitFor(() =>
    expect(screen.queryByTestId("thought-list-loading")).toBeNull(),
  );
  expect(screen.queryByText("cbt_list.empty")).toBeNull();
});

function NavigationHarness() {
  const [, setVersion] = React.useState(0);
  rerenderRoute = () => setVersion((version) => version + 1);
  return (
    <mockRouteContext.Provider value={route}>
      <ThoughtsLayout />
      <Pressable
        testID="open-create"
        onPress={() => {
          route = "create";
          rerenderRoute();
        }}
      />
      <Pressable
        testID="open-edit"
        onPress={() => {
          route = "edit";
          mockParams = { idOrKey: "00000000-0000-4000-8000-000000000004" };
          rerenderRoute();
        }}
      />
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
  const record = thought(
    "00000000-0000-4000-8000-000000000003",
    "fresh after create",
    new Date("2026-08-22T12:00:00Z"),
  );
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([]).mockResolvedValueOnce([record]);
  mockWrite.mockResolvedValueOnce(undefined);
  renderWithProviders(<NavigationHarness />);

  await waitFor(() => expect(screen.getByText("cbt_list.empty")).toBeTruthy());
  fireEvent.press(screen.getByTestId("open-create"));
  fireEvent.changeText(
    screen.getByTestId("automatic-thought-input"),
    "fresh after create",
  );
  save();
  showWideJournal();

  await waitFor(() =>
    expect(screen.getByText("fresh after create")).toBeTruthy(),
  );
});

test("refreshes the retained journal after an edit returns to the selected thought", async () => {
  const before = thought(
    "00000000-0000-4000-8000-000000000004",
    "before edit",
    new Date("2026-08-22T12:00:00Z"),
  );
  const after = thought(before.uuid, "after edit", before.createdAt);
  ready.mockResolvedValue({} as never);
  mockReadAll.mockResolvedValueOnce([before]).mockResolvedValueOnce([after]);
  mockRead.mockResolvedValueOnce(before);
  mockWrite.mockResolvedValueOnce(undefined);
  renderWithProviders(<NavigationHarness />);

  await waitFor(() => expect(screen.getByText("before edit")).toBeTruthy());
  fireEvent.press(screen.getByTestId("open-edit"));
  await waitFor(() =>
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy(),
  );
  fireEvent.changeText(
    screen.getByTestId("automatic-thought-input"),
    "after edit",
  );
  save();
  showWideJournal();

  await waitFor(() => expect(screen.getByText("after edit")).toBeTruthy());
});
