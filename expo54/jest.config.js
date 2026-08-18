/** @type {import("jest").Config} **/
export default {
  preset: "jest-expo",
  setupFiles: ["./tests/support/jest-setup.ts"],
  testMatch: [
    '<rootDir>/tests/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  transform: {
    // Third-party .ts/.tsx under node_modules (e.g. heroui-native, uniwind,
    // react-native-gesture-handler's commonjs/*.ts) aren't part of this
    // project's tsconfig, so ts-jest silently skips transforming them and
    // (with diagnostics on) type-checks them against files it can't fully
    // resolve. Route node_modules TS through babel instead, same as the
    // node_modules .js/.jsx rule below.
    "/node_modules/.+\\.tsx?$": ["babel-jest", { presets: ["babel-preset-expo"] }],
    "^.+\\.tsx?$": ["ts-jest", {
      // diagnostics: false,
      tsconfig: {
        jsx: "react-jsx",
        module: "commonjs",
      },
    }],
    // @noble/ciphers and @noble/hashes ship ESM-only .js files; transform
    // them (and anything else under node_modules) through babel so their
    // `import`/`export` syntax runs under Jest's CommonJS environment.
    "^.+\\.jsx?$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble|heroui-native|uniwind))",
    "/node_modules/react-native-reanimated/plugin/",
  ],
};