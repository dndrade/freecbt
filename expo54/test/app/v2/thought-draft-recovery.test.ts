/**
 * @jest-environment jsdom
 */
import { Storage } from "@/src";
import { DistortionData, Thought } from "@/src/model";
import { ModelProvider } from "@/src/hooks/use-model";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import type { ThoughtSaveOutboxRecord } from "@/src/platform/storage/storage";
import Home from "@/src/app/v2/(public)/(tabs)/index";
import { View } from "react-native";

jest.mock("@/src/components", () => ({
  ImagePath: { bubbles: [1] },
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  ...jest.requireActual("@/src/i18n/use-i18n"),
  useTranslate: () => (key: string) => key,
}));

jest.mock("@/src/hooks/use-safe-area", () => ({
  useSafeWindowDimensions: () => ({ width: 400, height: 800 }),
}));

jest.mock("react-native-reanimated", () => ({
  useSharedValue: () => ({ value: 0, get: () => 0 }),
}));

jest.mock("react-native-reanimated-carousel", () => ({
  __esModule: true,
  default: (props: {
    data: readonly Thought.SlideName[];
    renderItem: (props: { item: Thought.SlideName }) => React.ReactNode;
  }) => React.createElement(View, null, props.renderItem({ item: props.data[0] })),
  Pagination: { Basic: () => null },
}));

function spec(automaticThought: string): Thought.Spec {
  return { ...Thought.emptySpec(), automaticThought };
}

function record(
  seed: number,
  status: ThoughtSaveOutboxRecord["status"]
): ThoughtSaveOutboxRecord {
  const thought = Thought.create(
    spec(`recovery ${seed}`),
    new Date(Date.UTC(2026, 7, 11, 0, 0, seed))
  );
  return {
    submissionId: thought.uuid,
    thought,
    sourceDraftRevision: seed,
    attemptCount: seed + 1,
    lastAttemptAt: new Date(Date.UTC(2026, 7, 11, 0, 10, seed)),
    lastError: status === "failed" ? `failed-${seed}` : null,
    retryRequested: status === "failed",
    thoughtPersisted: status === "cleanup-failed",
    updatedAt: new Date(Date.UTC(2026, 7, 11, 0, 20, seed)),
    status,
  };
}

test("Home displays restarted recovery records without labeling normal recovery as saved Thought cleanup", async () => {
  await AsyncStorage.clear();
  const records = [
    record(1, "insertion-pending"),
    record(2, "pending"),
    record(3, "uncertain"),
    record(4, "active"),
    record(5, "failed"),
    record(6, "cleanup-failed"),
    ...Array.from({ length: 14 }, (_, index) => record(index + 7, "pending")),
  ];
  const outbox = Storage.thoughtSaveOutbox(DistortionData, AsyncStorage);
  for (const item of records) await outbox.insert(item);
  const setItem = jest.spyOn(AsyncStorage, "setItem");
  setItem.mockClear();
  const view = render(
    React.createElement(ModelProvider, null, React.createElement(Home))
  );

  await waitFor(() => expect(view.getByTestId("thought-save-recovery")).toBeTruthy());

  expect(view.getByText("Recovery needed: recovery 2")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 3")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 4")).toBeTruthy();
  expect(view.getByText("Recovery needed: recovery 5")).toBeTruthy();
  expect(view.getByText("Saved Thought cleanup needed: recovery 6")).toBeTruthy();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 2")).toBeNull();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 3")).toBeNull();
  expect(view.queryByText("Saved Thought cleanup needed: recovery 5")).toBeNull();
  expect(setItem).not.toHaveBeenCalled();
  setItem.mockRestore();
});
