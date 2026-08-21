import type { StateStorage } from "zustand/middleware";
import { mmkv } from "./mmkv";

export interface MmkvLike { getString(key: string): string | undefined; set(key: string, value: string): void; delete(key: string): void; }

export function createZustandMmkvStorage(storage: MmkvLike): StateStorage {
  return { getItem: (key) => storage.getString(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
}

export const zustandMmkvStorage = createZustandMmkvStorage({
  getString: (key) => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
  delete: (key) => mmkv.remove(key),
});
