/** @type {import("jest").Config} **/
export default {
  preset: "jest-expo",
  setupFiles: ["./src/testing/jest-setup.ts"],
  testMatch: [
    '<rootDir>/{src,test}/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      // diagnostics: false,
      tsconfig: {
        jsx: "react-jsx",
      },
    }],
    // @noble/ciphers and @noble/hashes ship ESM-only .js files; transform
    // them (and anything else under node_modules) through babel so their
    // `import`/`export` syntax runs under Jest's CommonJS environment.
    "^.+\\.jsx?$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble))",
    "/node_modules/react-native-reanimated/plugin/",
  ],
};