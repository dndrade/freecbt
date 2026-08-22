import Create from "@/app/v2/(public)/thoughts/create";
import Edit from "@/app/v2/(public)/thoughts/[idOrKey]/edit";
import Home from "@/app/v2/(public)/(tabs)/index";
import List from "@/app/v2/(public)/(tabs)/thoughts";
import View from "@/app/v2/(public)/(tabs)/thoughts/[idOrKey]";
import { ThoughtCreateScreen } from "@/features/thoughtRecord/screens/ThoughtCreateScreen";
import { ThoughtEditScreen } from "@/features/thoughtRecord/screens/ThoughtEditScreen";
import { ThoughtHomeComposerScreen } from "@/features/thoughtRecord/screens/ThoughtHomeComposerScreen";
import { ThoughtListScreen } from "@/features/thoughtRecord/screens/ThoughtListScreen";
import { ThoughtViewScreen } from "@/features/thoughtRecord/screens/ThoughtViewScreen";
import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("@/features/thoughtRecord/screens/ThoughtCreateScreen", () => ({
  ThoughtCreateScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtEditScreen", () => ({
  ThoughtEditScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtHomeComposerScreen", () => ({
  ThoughtHomeComposerScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtListScreen", () => ({
  ThoughtListScreen: jest.fn(() => null),
}));
jest.mock("@/features/thoughtRecord/screens/ThoughtViewScreen", () => ({
  ThoughtViewScreen: jest.fn(() => null),
}));

beforeEach(() => jest.clearAllMocks());

test.each([
  ["create", Create, ThoughtCreateScreen],
  ["edit", Edit, ThoughtEditScreen],
  ["home", Home, ThoughtHomeComposerScreen],
  ["view", View, ThoughtViewScreen],
])("wires the %s route to its screen", (_name, Route, Screen) => {
  render(<Route />);

  expect(jest.mocked(Screen)).toHaveBeenCalledTimes(1);
});

test("defers the journal route to its layout-owned list", () => {
  render(<List />);

  expect(jest.mocked(ThoughtListScreen)).not.toHaveBeenCalled();
});
