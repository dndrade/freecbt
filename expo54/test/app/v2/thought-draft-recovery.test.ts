/**
 * @jest-environment jsdom
 */
import { Storage } from "@/src";
import { Action, DistortionData, Model, Thought } from "@/src/model";
import { ModelProvider, useModel } from "@/src/hooks/use-model";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import type { ThoughtSaveOutboxRecord } from "@/src/platform/storage/storage";

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

test("Home receives all unresolved recovery records and full capacity after restart", async () => {
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
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(ModelProvider, null, children)
  );
  const { result } = renderHook(() => useModel(), { wrapper });

  await waitFor(() => expect(result.current[0].status).toBe("ready"));

  const hydrated = result.current[0] as Model.Ready;
  expect(hydrated.thoughtSaveOutbox).toEqual([
    ...records.slice(0, 3),
    { ...records[3], status: "uncertain" },
    ...records.slice(4),
  ]);
  expect(hydrated.thoughtSaveOutbox).toHaveLength(20);
  expect(hydrated.thoughtSaveOutbox.filter((item) => item.status === "cleanup-failed")).toEqual([
    records[5],
  ]);
  expect(hydrated.thoughtSaveOutbox.filter((item) => item.status === "failed")).toEqual([
    records[4],
  ]);
  expect(
    Model.update(
      hydrated,
      Action.createThought(spec("capacity is full"), new Date("2026-08-11T01:00:00.000Z"))
    )[1]
  ).toEqual([]);
  expect(setItem).not.toHaveBeenCalled();
  setItem.mockRestore();
});
