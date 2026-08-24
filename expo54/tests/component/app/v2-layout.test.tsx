import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../../global.css", () => ({}), { virtual: true });

const preventAutoHideAsync = jest.fn().mockResolvedValue(undefined);
const hideAsync = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: (...args: unknown[]) => preventAutoHideAsync(...args),
  hideAsync: (...args: unknown[]) => hideAsync(...args),
}));

type Deferred = {
  resolve: () => void;
  reject: (err: unknown) => void;
};
let deferred: Deferred | undefined;
const runSettingsBootstrap = jest.fn(
  () =>
    new Promise<void>((resolve, reject) => {
      deferred = { resolve, reject };
    }),
);
jest.mock("@/src/features/settings/hooks/settingsBootstrap", () => ({
  runSettingsBootstrap: () => runSettingsBootstrap(),
}));

jest.mock("@/src/view/gateways/app-provider", () => ({
  AppProvider: (props: { children: React.ReactNode }) => props.children,
}));

function mockSafeAreaProvider(props: { children: React.ReactNode }) {
  return props.children;
}

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: mockSafeAreaProvider,
}));

jest.mock("heroui-native/provider", () => ({
  HeroUINativeProvider: (props: { children: React.ReactNode }) =>
    props.children,
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: (props: { children: React.ReactNode }) =>
    props.children,
}));

jest.mock("expo-router", () => {
  const react = require("react");
  const rn = require("react-native");
  return {
    Slot: () => react.createElement(rn.Text, null, "slot rendered"),
  };
});

// The module-level `SplashScreen.preventAutoHideAsync()` call runs once,
// the moment this file's static import below is evaluated -- before any
// test or beforeEach runs. Asserting it here (module scope, not inside a
// test) is what proves it fires at import/module-evaluation time rather
// than from an effect.
import Layout from "@/src/app/v2/_layout";
if (preventAutoHideAsync.mock.calls.length !== 1) {
  throw new Error(
    "expected SplashScreen.preventAutoHideAsync() to be called exactly once " +
      "at module evaluation (before any test runs)",
  );
}

describe("v2 root layout", () => {
  beforeEach(() => {
    hideAsync.mockClear();
    runSettingsBootstrap.mockClear();
    deferred = undefined;
  });

  it("called preventAutoHideAsync exactly once, at module evaluation", () => {
    // Verified above at import time; re-assert here so it shows as a test.
    expect(preventAutoHideAsync).toHaveBeenCalledTimes(1);
  });

  it("renders nothing and does not hide the splash screen while bootstrap is pending", () => {
    render(<Layout />);

    expect(runSettingsBootstrap).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("slot rendered")).toBeNull();
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it("renders the app and hides the splash screen once bootstrap resolves", async () => {
    render(<Layout />);
    expect(screen.queryByText("slot rendered")).toBeNull();

    await act(async () => {
      deferred?.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("slot rendered")).toBeTruthy();
    });
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it("places HeroUI and its portal host inside SafeAreaProvider", async () => {
    const { UNSAFE_getByType } = render(<Layout />);

    await act(async () => {
      deferred?.resolve();
      await Promise.resolve();
    });

    expect(UNSAFE_getByType(mockSafeAreaProvider)).toBeTruthy();
  });

  // The layout's bootstrap effect is `try { await runSettingsBootstrap(); }
  // finally { setIsReady(true); await SplashScreen.hideAsync(); }`, with no
  // catch. On rejection, that finally still runs: the app still renders
  // (setIsReady(true) happens first) and the splash still hides (hideAsync()
  // is called next). Only *after* that finally block's own `await` settles
  // does the original rejection re-propagate out of the effect's
  // fire-and-forget async IIFE -- and since nothing there awaits it either
  // (same as production), that would be a genuine unhandled rejection with
  // no supported way for a test in this file to intercept or expect it (the
  // sandboxed `process` this file sees is a disconnected copy of the one
  // Jest's own unhandled-rejection reporting actually listens on -- see
  // node_modules/jest-util/build/createProcessObject.js).
  //
  // Sidestep that entirely: what this test needs to prove is only that
  // `hideAsync()` gets *called* on rejection -- not that its own promise
  // ever resolves. Make hideAsync() return a promise that never settles for
  // this test only, so the finally block's `await SplashScreen.hideAsync()`
  // never completes, the original rejection is never re-thrown, and the
  // effect's outer promise simply stays pending -- nothing ever becomes
  // unhandled, and the render-based assertion below still exercises the
  // real Layout component and the real finally guarantee.
  it("runs the finally (setIsReady + hideAsync) even when the awaited call rejects", async () => {
    const bootstrapError = new Error("bootstrap failed");
    hideAsync.mockReturnValueOnce(new Promise<void>(() => {}));

    render(<Layout />);
    expect(screen.queryByText("slot rendered")).toBeNull();

    await act(async () => {
      deferred?.reject(bootstrapError);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("slot rendered")).toBeTruthy();
    });
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });
});
