import { Platform } from "react-native";

// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/
jest.mock("@react-native-async-storage/async-storage", () =>
  // the docs recommend this way
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// this gets jest-expo working. not sure why it's needed.
// https://github.com/expo/expo/issues/36831#issuecomment-3107047371
jest.mock("expo/src/winter/ImportMetaRegistry", () => ({
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
}));
if (typeof global.structuredClone === "undefined") {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}

// this package is giving me syntax errors only in jest, can't figure it out, but we don't need real uuids for tests.
// string matches zod's uuid validation.
jest.mock("uuid", () => {
  let i = 0;
  return {
    v4: () => `00000000-0000-4000-8000-${`${i++}`.padStart(12, "0")}`,
  };
});

// silence some dumb warning
process.env.EXPO_OS = Platform.OS;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    navigate: () => {},
  }),
}));

// expo-secure-store's native module isn't linked in the jest environment,
// so real calls resolve `undefined` instead of `null`/rejecting. Mock it
// with a simple in-memory store so tests that mount the real ModelProvider
// (which now uses SecureStore for the pincode) see real get/set/delete
// semantics instead.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});
