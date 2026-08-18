/** @type {import("jest").Config} **/
export default {
  preset: "jest-expo",

  setupFiles: ["./tests/support/jest-setup.ts"],

  testMatch: [
    "<rootDir>/tests/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],

  collectCoverageFrom: [
    "<rootDir>/src/**/*.{js,jsx,ts,tsx}",

    "!<rootDir>/src/**/*.d.ts",

    // Debug/lab code is intentionally excluded from product coverage.
    // If promoted to a real feature, it moves out of src/debug or app/v2/debug
    // and becomes part of coverage automatically.
    "!<rootDir>/src/debug/**",
    "!<rootDir>/src/app/v2/debug/**",
  ],

  coverageDirectory: "<rootDir>/coverage",

  coverageReporters: [
    "text",
    "lcov",
  ],

  transform: {
    "/node_modules/.+\\.tsx?$": [
      "babel-jest",
      { presets: ["babel-preset-expo"] },
    ],

    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
        },
      },
    ],

    "^.+\\.jsx?$": [
      "babel-jest",
      { presets: ["babel-preset-expo"] },
    ],
  },

  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@noble|heroui-native|uniwind))",
    "/node_modules/react-native-reanimated/plugin/",
  ],
};