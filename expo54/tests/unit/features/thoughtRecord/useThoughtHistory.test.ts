import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useThoughtHistory } from "@/features/thoughtRecord/hooks/useThoughtHistory";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";

const readAll = jest.fn<Promise<unknown[]>, []>();

jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ readAll })),
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;

afterEach(() => {
  jest.clearAllMocks();
});

test("reports initial loading until readiness and reading finish", async () => {
  let resolveReady: (value: never) => void = () => undefined;
  ready.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveReady = resolve as (value: never) => void;
    })
  );
  readAll.mockResolvedValueOnce([]);

  const { result } = renderHook(useThoughtHistory);

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveReady({} as never);
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
});

test("retains a readiness error without throwing during mount", async () => {
  const failure = new Error("database unavailable");
  ready.mockRejectedValueOnce(failure);

  const { result } = renderHook(useThoughtHistory);

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current).toMatchObject({ thoughts: [], error: failure });
});

test("retains a read error after readiness resolves", async () => {
  const failure = new Error("read failed");
  ready.mockResolvedValueOnce({} as never);
  readAll.mockRejectedValueOnce(failure);

  const { result } = renderHook(useThoughtHistory);

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current).toMatchObject({ thoughts: [], error: failure });
});

test("refresh retries a failed readiness check and clears the error", async () => {
  const failure = new Error("import failed");
  ready.mockRejectedValueOnce(failure).mockResolvedValueOnce({} as never);
  readAll.mockResolvedValueOnce([{ automaticThought: "recovered" }]);
  const { result } = renderHook(useThoughtHistory);

  await waitFor(() => expect(result.current.error).toBe(failure));
  await act(async () => {
    await result.current.refresh();
  });

  expect(result.current).toMatchObject({
    thoughts: [{ automaticThought: "recovered" }],
    isLoading: false,
    error: null,
  });
});

test("reads once for one mounted history owner", async () => {
  ready.mockResolvedValueOnce({} as never);
  readAll.mockResolvedValueOnce([{ automaticThought: "one read" }]);

  const { result } = renderHook(useThoughtHistory);

  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(ready).toHaveBeenCalledTimes(1);
  expect(readAll).toHaveBeenCalledTimes(1);
});
