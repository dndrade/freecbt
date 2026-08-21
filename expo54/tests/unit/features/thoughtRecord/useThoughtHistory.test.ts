import { renderHook, waitFor } from "@testing-library/react-native";
const readAll = jest.fn<Promise<unknown[]>, []>(async () => []);
jest.mock("@/services/database/client", () => ({ getDatabase: jest.fn(async () => ({})) }));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({ thoughtsService: jest.fn(() => ({ readAll })) }));
import { useThoughtHistory } from "@/features/thoughtRecord/hooks/useThoughtHistory";
test("loads history on mount", async () => { readAll.mockResolvedValueOnce([{ automaticThought: "a" }]); const { result } = renderHook(useThoughtHistory); await waitFor(() => expect(result.current.isLoading).toBe(false)); expect(result.current.thoughts).toEqual([{ automaticThought: "a" }]); });
