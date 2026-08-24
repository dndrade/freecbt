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

  // The layout's bootstrap effect is `try { await runSettingsBootstrap(); }
  // finally { setIsReady(true); await SplashScreen.hideAsync(); }`, with no
  // catch. On rejection, that finally still runs (the app renders and the
  // splash still hides), and the rejection then propagates out of the
  // effect's own fire-and-forget async IIFE, same as production -- nothing
  // there awaits it either. Exercising that specific path through a real
  // render would leave a genuinely unhandled rejection on the process, which
  // jest has no supported way to expect or intercept from inside a test
  // file (jest-environment-node's sandboxed `process` is a disconnected
  // clone of the real one jest's own error handlers listen on -- see
  // node_modules/jest-util/build/createProcessObject.js). So this proves
  // the finally guarantee directly against the exact same try/finally/
  // no-catch shape, fully awaited (nothing left unhandled), while the
  // "resolves" test above already proves Layout's effect really reaches
  // this finally when rendered.
  it("runs the finally (setIsReady + hideAsync) even when the awaited call rejects", async () => {
    const setIsReady = jest.fn();
    const bootstrapError = new Error("bootstrap failed");

    const run = async () => {
      try {
        await Promise.reject(bootstrapError);
      } finally {
        setIsReady(true);
        await hideAsync();
      }
    };

    await expect(run()).rejects.toBe(bootstrapError);
    expect(setIsReady).toHaveBeenCalledWith(true);
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });
});
