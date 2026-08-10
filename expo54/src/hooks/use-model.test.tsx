/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Action, Model, Settings, Thought } from "../model";
import { ModelProvider, useModel } from "./use-model";

test("use-model basics", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  const model = () => result.current[0];
  const ready = () => {
    const m = model();
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  const dispatch = () => result.current[1];
  expect(model()).toBe(Model.loading);
  await waitFor(() => expect(model().status).toBe("ready"));
  expect(ready().thoughts.size).toBe(0);
  expect(ready().settings.theme).toBe(null);
  act(() => dispatch()(Action.createThought(Thought.emptySpec(), new Date(0))));
  expect(ready().thoughts.size).toBe(1);
  act(() => dispatch()(Action.setTheme("dark")));
  expect(ready().settings.theme).toBe("dark");
});

// Regression test for #7: confirm every setting propagates through the real
// ModelProvider context (not just the pure reducer) to any consumer reading
// useModel(), since that's the actual mechanism screens rely on for reactivity.
test("use-model settings propagate through context for every consumer", async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  const model = () => result.current[0];
  const ready = () => {
    const m = model();
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  const dispatch = () => result.current[1];
  await waitFor(() => expect(model().status).toBe("ready"));

  // theme: settings value and its derived consumer (Model.colorScheme) both update
  act(() => dispatch()(Action.setTheme("dark")));
  expect(ready().settings.theme).toBe("dark");
  expect(Model.colorScheme(ready())).toBe("dark");

  // locale: settings value and its derived consumer (Model.locale) both update
  act(() => dispatch()(Action.setLocale("es")));
  expect(ready().settings.locale).toBe("es");
  expect(Model.locale(ready())).toBe("es");

  // reminders
  act(() => dispatch()(Action.setReminders(true)));
  expect(ready().settings.reminders).toBe(true);

  // history label: settings value and its consumer (Thought.label) both update
  act(() =>
    dispatch()(Action.createThought(Thought.emptySpec(), new Date(0)))
  );
  const [thought] = ready().thoughts.values();
  act(() => dispatch()(Action.setHistoryLabel("automatic-thought")));
  expect(ready().settings.historyLabels).toBe("automatic-thought");
  expect(Thought.label(thought, ready())).toBe(thought.automaticThought);

  // pincode: settings value and its consumer (auth gate condition) both update
  expect(ready().settings.pincode).toBe(null);
  act(() => dispatch()(Action.setPincode("1234")));
  expect(ready().settings.pincode).toBe("1234");
  expect(ready().sessionAuthed).toBe(true); // set-pincode authenticates the session that set it
  act(() => dispatch()(Action.setPincode(null)));
  expect(ready().settings.pincode).toBe(null);
});

test("use-model reports completion persistence failure", async () => {
  const error = new Error("settings write failed");
  const multiSet = jest
    .spyOn(AsyncStorage, "multiSet")
    .mockRejectedValueOnce(error);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  act(() => result.current[1](Action.beginOnboardingCompletion()));
  await waitFor(() =>
    expect((result.current[0] as Model.Ready).onboardingCompletion).toEqual({
      status: "failure",
      error,
    })
  );
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(false);
  multiSet.mockRestore();
});

test("use-model reports completion success only after persistence resolves", async () => {
  let resolveWrite!: () => void;
  const writePending = new Promise<void>((resolve) => {
    resolveWrite = resolve;
  });
  const multiSet = jest
    .spyOn(AsyncStorage, "multiSet")
    .mockReturnValueOnce(writePending);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );
  const { result } = renderHook(() => useModel(), { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  act(() => result.current[1](Action.beginOnboardingCompletion()));
  await waitFor(() =>
    expect(multiSet).toHaveBeenCalledWith(
      expect.arrayContaining([[Settings.existingUserKey, "1"]])
    )
  );
  expect((result.current[0] as Model.Ready).onboardingCompletion).toBe("saving");
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(false);

  resolveWrite();
  await waitFor(() =>
    expect((result.current[0] as Model.Ready).onboardingCompletion).toBe("idle")
  );
  expect((result.current[0] as Model.Ready).settings.existingUser).toBe(true);
  multiSet.mockRestore();
});
