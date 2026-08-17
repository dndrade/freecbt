import { Routes } from "@/src";
import { Model, Thought } from "@/src/model";
import { Redirect, Unmatched, useLocalSearchParams } from "expo-router";
import React from "react";

type Result<V, E> =
  | { status: "success"; value: V }
  | { status: "error"; error: E };

export function useThoughtFromParams(
  model: Model.Ready
): Result<Thought.Thought, React.JSX.Element> {
  const { idOrKey } = useLocalSearchParams<{ idOrKey: string }>();
  const id = Thought.Thought.shape.uuid.decode(idOrKey);
  const key = Thought.keyFromId.decode(id);
  if (idOrKey === key) {
    return {
      status: "error",
      error: <Redirect href={Routes.thoughtViewV2(id)} />,
    };
  }
  const thought = model.thoughts.get(key) ?? null;
  if (!thought) {
    return { status: "error", error: <Unmatched /> };
  }
  return { status: "success", value: thought };
}
