import { Platform } from "react-native";
import { installFreeCBTTestTheme } from "./freecbt-test-theme";

// HeroUI Native components resolve theme colors via Uniwind's
// useCSSVariable(), which under jsdom reads real CSS custom properties from
// document.head. Jest doesn't run Metro/Uniwind's CSS pipeline, so install a
// resolved light-theme mirror before any test renders. See
// tests/support/freecbt-test-theme.ts for details.
installFreeCBTTestTheme();

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

// provide a polyfill for crypto.randomUUID since it's not available in Node.js/Jest
if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.randomUUID !== "function") {
  let counter = 0;
  if (globalThis.crypto === undefined) {
    (globalThis as any).crypto = {};
  }
  (globalThis.crypto as any).randomUUID = () =>
    `00000000-0000-4000-8000-${`${counter++}`.padStart(12, "0")}`;
}

// silence some dumb warning
process.env.EXPO_OS = Platform.OS;

// react-native-safe-area-context's native module isn't linked in the jest
// environment, so useSafeAreaInsets() throws "No safe area value available"
// for any component that calls it without an explicit <SafeAreaProvider>
// ancestor (e.g. @react-navigation/drawer's DrawerContentScrollView). The
// package ships an official jest mock for exactly this; use it so real
// components can call the hook directly in tests.
// https://github.com/th3rdwave/react-native-safe-area-context#jest
jest.mock("react-native-safe-area-context", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-safe-area-context/jest/mock").default
);

// @react-navigation/core's useTheme() throws "Couldn't find a theme" for any
// component (e.g. @react-navigation/drawer's DrawerItem) that reads it
// without a <NavigationContainer> ancestor providing ThemeContext — which
// Expo Router supplies at the real app root, but unit tests don't mount.
// Fall back to the library's own DefaultTheme when no provider is present,
// the same fallback-instead-of-throw shape as the official safe-area-context
// jest mock above.
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useContext } = require("react");

  return {
    ...actual,
    useTheme: () => useContext(actual.ThemeContext) ?? actual.DefaultTheme,
  };
});

// jest-expo's native module mock makes requireNativeModule('ExpoGo') always
// succeed, so isRunningInExpoGo() reports true under Jest even though tests
// never actually run in Expo Go. Left alone, that trips expo-notifications'
// "removed from Expo Go" warning at import time. Nothing in src/ or tests/
// reads isRunningInExpoGo(), so overriding it to false is safe.
jest.mock("expo", () => ({
  ...jest.requireActual("expo"),
  isRunningInExpoGo: () => false,
}));

// @expo/vector-icons' Icon component checks Font.isLoaded() on mount and,
// if false, awaits Font.loadAsync() before setState-ing fontIsLoaded: true.
// jest-expo's ExpoFontLoader mock reports nothing as loaded, so that setState
// lands on a later microtask outside any test's render()/act() call. Nothing
// in src/ or tests/ uses expo-font directly - it's only pulled in
// transitively via icons - so reporting every font as already loaded is
// accurate enough for tests and skips the async branch entirely.
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"),
  isLoaded: () => true,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    navigate: () => {},
    push: () => {},
  }),
  // screens tweak their own navigation options (e.g. hiding the tab bar); off a
  // navigator there's nothing to set, so accept and drop it.
  useNavigation: () => ({ setOptions: () => {} }),
  // off a real navigator there's no focus/blur to observe, so just run the
  // effect once - tests that care about refocus behavior mock this themselves.
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react").useEffect(effect, []);
  },
}));

// expo-secure-store's native module isn't linked in the jest environment,
// so real calls resolve `undefined` instead of `null`/rejecting. Mock it
// with a simple in-memory store so tests that mount the real ModelProvider
// (which now uses SecureStore for the pincode) see real get/set/delete
// semantics instead.
jest.mock("expo-secure-store", () => {
    const store = new Map<string, string>();

    return {
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,

        getItemAsync: async (key: string) => store.get(key) ?? null,

        setItemAsync: async (
            key: string,
            value: string,
            _options?: {
                keychainAccessible?: number;
            }
        ) => {
            store.set(key, value);
        },

        deleteItemAsync: async (key: string) => {
            store.delete(key);
        },
    };
});
// expo-crypto's native module isn't linked in the jest environment. Mock
// getRandomBytesAsync with real randomness (via Node's crypto) so tests
// that check for salt/nonce uniqueness are meaningful, not just wired.
jest.mock("expo-crypto", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");

    return {
        randomUUID: () => nodeCrypto.randomUUID(),
        getRandomBytesAsync: async (byteCount: number) => {
            const buf = nodeCrypto.randomBytes(byteCount);
            return new Uint8Array(buf);
        },

        digest: async (_algorithm: string, data: BufferSource) => {
            const bytes = Buffer.from(
                data instanceof ArrayBuffer
                    ? data
                    : data.buffer.slice(
                        data.byteOffset,
                        data.byteOffset + data.byteLength
                    )
            );

            return nodeCrypto.createHash("sha256").update(bytes).digest().buffer;
        },
    };
});

// react-native-quick-crypto's native module isn't linked in the jest
// environment. Mock pbkdf2 using Node's own (native) crypto.pbkdf2 so
// archive-crypto tests exercise genuine PBKDF2 behavior, not a stub —
// same rationale as the expo-crypto mock above.
jest.mock("react-native-quick-crypto", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");

  return {
    pbkdf2: (
      password: Uint8Array,
      salt: Uint8Array,
      iterations: number,
      keylen: number,
      digest: string,
      callback: (err: Error | null, derivedKey?: Buffer) => void
    ) => {
      nodeCrypto.pbkdf2(password, salt, iterations, keylen, digest, callback);
    },
  };
});
