import { Storage } from "../..";
import { Archive, DistortionData, Settings, Thought } from "../../model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { z } from "zod";

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
    getAllKeys: async () => Array.from(store.keys()),
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

test("read: a failing SecureStore write during migration leaves the legacy pincode untouched and still returns it", async () => {
  const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
  const secure: Storage.SecureStoreLike = {
    getItemAsync: async () => null,
    setItemAsync: async () => {
      throw new Error("secure store unavailable");
    },
    deleteItemAsync: async () => {},
  };
  const s = Storage.settings(async, secure);
  const result = await s.read();
  expect(result.pincode).toBe("1234");
  expect(await async.getItem(Settings.pincodeKey)).toBe("1234");
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

test("readAll: a malformed thought does not delete either record", async () => {
  const validUuid = "11111111-1111-1111-1111-111111111111";
  const validKey = `${Thought.KEY_PREFIX}${validUuid}`;
  const malformedKey = `${Thought.KEY_PREFIX}22222222-2222-2222-2222-222222222222`;
  const validThoughtJson = {
    v: "Thought-v1",
    automaticThought: "auto",
    alternativeThought: "alt",
    cognitiveDistortions: ["all-or-nothing"],
    challenge: "chal",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    uuid: validUuid,
  };
  const async = fakeAsyncStorage({
    [validKey]: JSON.stringify(validThoughtJson),
    [malformedKey]: "not valid json {",
  });
  const T = Storage.thoughts(DistortionData, async);

  const result = await T.readAll();

  expect(result.thoughts.size).toBe(1);
  expect(result.thoughtParseErrors.size).toBe(1);
  expect(result.thoughts.has(validKey as Thought.Key)).toBe(true);
  expect(result.thoughtParseErrors.has(malformedKey as Thought.Key)).toBe(true);
  expect(result.thoughtParseErrors.get(malformedKey as Thought.Key)).toBeInstanceOf(
    z.ZodError
  );
  expect(await async.getItem(validKey)).not.toBe(null);
  expect(await async.getItem(malformedKey)).not.toBe(null);
});

test("readAll: restores every thought from a decoded historical archive", async () => {
  // Same real historical-format snapshot already used in
  // model/archive/thoughts-archive.test.ts's "parse nonempty json snapshot from old version".
  const snapshot =
    ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2qAIblGkC2zRKCAKmSo0oIVuwIhkzADbT0AO0roRU6RJlF0cedzToBFakREaJCUpXkoeGACIpa7OD1Lz6kBqNmZScTPNISFEUQAF1CBDh0bnQAExhjaBwATgB2AAZMdJwsnD509MgCopwAOgAmAGYAFgAtCXIAB1iY+MSQFIzc3PzC4uyKmvrCcnIUWJFaTnRR8YkIaAMhImw8AF9QtaA===:FreeCBT:";
  const A = Archive.createParsers(DistortionData);
  const arc = A.fromString.decode(snapshot);
  expect(arc.thoughts).toHaveLength(1);

  const async = fakeAsyncStorage();
  const T = Storage.thoughts(DistortionData, async);
  for (const t of arc.thoughts) {
    await T.write(t);
  }

  const result = await T.readAll();
  expect(result.thoughts.size).toBe(arc.thoughts.length);
  expect(result.thoughtParseErrors.size).toBe(0);
  const [restored] = Array.from(result.thoughts.values());
  expect(restored.automaticThought).toBe("auto");
  expect(restored.challenge).toBe("chal");
  expect(restored.alternativeThought).toBe("alt");
  expect(restored.uuid).toBe("someuuid");
});
