jest.mock("@/services/storage/mmkv", () => ({ mmkv: {} }));

import { createZustandMmkvStorage, type MmkvLike } from "@/services/storage/zustandStorage";

function fake(): MmkvLike {
  const values = new Map<string, string>();
  return { getString: (key) => values.get(key), set: (key, value) => values.set(key, value), delete: (key) => values.delete(key) };
}

test("MMKV Zustand storage gets, sets, and removes values", () => {
  const storage = createZustandMmkvStorage(fake());
  expect(storage.getItem("k")).toBeNull();
  storage.setItem("k", "v");
  expect(storage.getItem("k")).toBe("v");
  storage.removeItem("k");
  expect(storage.getItem("k")).toBeNull();
});
