import { Settings } from "@/src/model";
import {
  settings,
  type SettingsSecureStoreLike,
} from "@/src/features/settings/data/settingsStorage";
import { createFakeAsyncStorage as fakeAsyncStorage } from "@/tests/support/async-storage";

function fakeSecureStore(
  initial: Record<string, string> = {},
): SettingsSecureStoreLike {
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
  const s = settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe(null);
});

test("read: migrates a legacy plaintext pincode from AsyncStorage to SecureStore", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
  const secure = fakeSecureStore();
  const s = settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("1234");
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("1234");
  expect(await async.getItem(Settings.pincodeKey)).toBe(null);
});

test("read: a failing SecureStore write during migration leaves the legacy pincode untouched and still returns it", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
  const secure: SettingsSecureStoreLike = {
    getItemAsync: async () => null,
    setItemAsync: async () => {
      throw new Error("secure store unavailable");
    },
    deleteItemAsync: async () => {},
  };
  const s = settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("1234");
  expect(await async.getItem(Settings.pincodeKey)).toBe("1234");
});

test("read: uses the SecureStore value when present, ignoring AsyncStorage", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "0000" });
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "5678" });
  const s = settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("5678");
});

test("write: routes pincode through SecureStore, other settings through AsyncStorage", async () => {
  const async = fakeAsyncStorage();
  const secure = fakeSecureStore();
  const setItemAsync = jest.spyOn(secure, "setItemAsync");

  const s = settings(async, secure);

  await s.write({ ...Settings.empty(), pincode: "4321", theme: "dark" });

  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("4321");
  expect(await async.getItem(Settings.pincodeKey)).toBe(null);
  expect(await async.getItem(Settings.themeKey)).toBe("dark");

  expect(setItemAsync).toHaveBeenCalledWith(Settings.pincodeSecureKey, "4321");
});

test("write: a null pincode deletes it from SecureStore", async () => {
  const async = fakeAsyncStorage();
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "9999" });
  const s = settings(async, secure);
  await s.write(Settings.empty());
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
});

test("clear: removes the pincode from SecureStore and other keys from AsyncStorage", async () => {
  const async = fakeAsyncStorage({ [Settings.themeKey]: "dark" });
  const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "1111" });
  const s = settings(async, secure);
  await s.clear();
  expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
  expect(await async.getItem(Settings.themeKey)).toBe(null);
});
