import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { resetAsyncStorage } from "@/tests/support/async-storage";
import { Settings } from "@/model";

const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

// jest-setup.ts's global expo-secure-store mock returns a plain (non-ESM)
// object; `import * as SecureStore` compiles to TS's __importStar helper,
// which wraps a non-`__esModule` module's exports in non-configurable
// getters -- jest.spyOn() then fails with "Cannot redefine property" trying
// to replace them. Re-mock with `__esModule: true` here so the namespace
// import returns the object as-is, with plain (spy-able) properties.
jest.mock("expo-secure-store", () => ({
  __esModule: true,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

import { useSettings } from "@/features/settings/hooks/useSettings";
import { runSettingsBootstrap } from "@/features/settings/hooks/settingsBootstrap";

beforeEach(async () => {
  await resetAsyncStorage();
  useSettings.setState({
    settings: { locale: null, reminders: false, existingUser: false },
  });
  // Zustand's patched setState persists; clear after resetting in-memory state
  // so each case can explicitly choose its MMKV starting record.
  values.clear();
  // restoreAllMocks() reverts jest.spyOn() wrappers to their original
  // implementation, but AsyncStorage's jest mock methods are jest.fn()s
  // from the start -- spyOn() on an already-mock function reuses the same
  // object rather than wrapping it, so its call history survives restore.
  // clearAllMocks() empties that history too, so each test starts at 0 calls.
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test("fresh install (no MMKV record, no legacy data) hydrates to public defaults", async () => {
  await runSettingsBootstrap();
  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: false,
    existingUser: false,
  });
});

test("migrates pre-existing legacy AsyncStorage data without mutating legacy storage", async () => {
  await AsyncStorage.multiSet([
    [Settings.localeKey, "es"],
    [Settings.remindersKey, "1"],
    [Settings.existingUserKey, "1"],
  ]);
  const secureSpy = jest.spyOn(SecureStore, "getItemAsync");
  const removeSpy = jest.spyOn(AsyncStorage, "multiRemove");
  const setSpy = jest.spyOn(AsyncStorage, "setItem");

  await runSettingsBootstrap();

  expect(useSettings.getState().settings).toEqual({
    locale: "es",
    reminders: true,
    existingUser: true,
  });
  expect(JSON.parse(values.get("@SettingsStore:v1")!).state.settings).toEqual({
    locale: "es",
    reminders: true,
    existingUser: true,
  });
  expect(await AsyncStorage.getItem(Settings.localeKey)).toBe("es");
  expect(removeSpy).not.toHaveBeenCalled();
  expect(setSpy).not.toHaveBeenCalled();
  expect(secureSpy).not.toHaveBeenCalled();
});

test("a second bootstrap call does not re-read legacy AsyncStorage", async () => {
  const multiGetSpy = jest.spyOn(AsyncStorage, "multiGet");
  await runSettingsBootstrap();
  expect(multiGetSpy).toHaveBeenCalledTimes(1);
  await runSettingsBootstrap();
  expect(multiGetSpy).toHaveBeenCalledTimes(1);
});

test("concurrent bootstrap calls share one legacy read", async () => {
  const multiGetSpy = jest.spyOn(AsyncStorage, "multiGet");
  await Promise.all([
    runSettingsBootstrap(),
    runSettingsBootstrap(),
    runSettingsBootstrap(),
  ]);
  expect(multiGetSpy).toHaveBeenCalledTimes(1);
});

test("valid persisted MMKV data loads without touching legacy storage", async () => {
  values.set(
    "@SettingsStore:v1",
    JSON.stringify({
      state: {
        settings: { locale: "fr", reminders: true, existingUser: true },
      },
      version: 0,
    }),
  );
  const multiGetSpy = jest.spyOn(AsyncStorage, "multiGet");

  await runSettingsBootstrap();

  expect(useSettings.getState().settings).toEqual({
    locale: "fr",
    reminders: true,
    existingUser: true,
  });
  expect(multiGetSpy).not.toHaveBeenCalled();
});

test("malformed (invalid JSON) persisted MMKV data falls back to the legacy read", async () => {
  values.set("@SettingsStore:v1", "{not json");
  await AsyncStorage.multiSet([[Settings.remindersKey, "1"]]);

  await runSettingsBootstrap();

  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: true,
    existingUser: false,
  });
});

test("an empty JSON MMKV record falls back to the legacy read", async () => {
  values.set("@SettingsStore:v1", "{}");
  await AsyncStorage.multiSet([[Settings.remindersKey, "1"]]);

  await runSettingsBootstrap();

  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: true,
    existingUser: false,
  });
});

test("a legacy read failure falls back to defaults and a later bootstrap call retries", async () => {
  const multiGetSpy = jest
    .spyOn(AsyncStorage, "multiGet")
    .mockRejectedValueOnce(new Error("disk error"));

  await runSettingsBootstrap();

  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: false,
    existingUser: false,
  });
  await AsyncStorage.multiSet([[Settings.remindersKey, "1"]]);
  await runSettingsBootstrap();

  expect(multiGetSpy).toHaveBeenCalledTimes(2);
  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: true,
    existingUser: false,
  });
});
