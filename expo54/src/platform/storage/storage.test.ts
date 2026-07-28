import { Storage } from "../..";
import { Settings } from "../../model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";

function fakeAsyncStorage(initial: Record<string, string> = {}) {
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
  } as unknown as AsyncStorageStatic;
}
function fakeSecureStore(
  initial: Record<string, string> = {}
): Storage.SecureStoreLike {
  const store = new Map(Object.entries(initial));
  return {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => {
      store.set(k, v);
    },
    deleteItemAsync: async (k) => {
      store.delete(k);
    },
  };
}

test("read: fresh install has no pincode in either store", async () => {
  const async = fakeAsyncStorage();
  const secure = fakeSecureStore();
  const s = Storage.settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe(null);
});

test("read: migrates a legacy plaintext pincode from AsyncStorage to SecureStore", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
  const secure = fakeSecureStore();
  const s = Storage.settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("1234");
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("1234");
  expect(await async.getItem(Settings.pincodeKey)).toBe(null);
});

test("read: uses the SecureStore value when present, ignoring AsyncStorage", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "0000" });
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "5678" });
  const s = Storage.settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("5678");
});

test("write: routes pincode through SecureStore, other settings through AsyncStorage", async () => {
  const async = fakeAsyncStorage();
  const secure = fakeSecureStore();
  const s = Storage.settings(async, secure);
  await s.write({ ...Settings.empty(), pincode: "4321", theme: "dark" });
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("4321");
  expect(await async.getItem(Settings.pincodeKey)).toBe(null);
  expect(await async.getItem(Settings.themeKey)).toBe("dark");
});

test("write: a null pincode deletes it from SecureStore", async () => {
  const async = fakeAsyncStorage();
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "9999" });
  const s = Storage.settings(async, secure);
  await s.write(Settings.empty());
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
});

test("clear: removes the pincode from SecureStore and other keys from AsyncStorage", async () => {
  const async = fakeAsyncStorage({ [Settings.themeKey]: "dark" });
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "1111" });
  const s = Storage.settings(async, secure);
  await s.clear();
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
  expect(await async.getItem(Settings.themeKey)).toBe(null);
});
