import AsyncStorage, {
  AsyncStorageStatic,
} from "@react-native-async-storage/async-storage";

/** Clears the real AsyncStorage mock; the module keeps one store across tests. */
export function resetAsyncStorage() {
  return AsyncStorage.clear();
}

/** An in-memory AsyncStorage double for tests that inject storage directly. */
export function createFakeAsyncStorage(
  initial: Record<string, string> = {}
): AsyncStorageStatic {
  const store = new Map(Object.entries(initial));
  return {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    multiGet: async (ks: readonly string[]) =>
      ks.map((k) => [k, store.get(k) ?? null] as const),
    multiSet: async (pairs: readonly [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
    multiRemove: async (ks: readonly string[]) => {
      for (const k of ks) store.delete(k);
    },
    getAllKeys: async () => Array.from(store.keys()),
  } as unknown as AsyncStorageStatic;
}
