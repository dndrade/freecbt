import { DistortionData, Thought } from "@/src/model";
import { screen } from "@testing-library/react-native";
import React from "react";
import { ThoughtEditScreen } from "@/src/features/thoughts/thought-edit-screen";
import { renderWithProviders } from "@/tests/support/render";

const T = Thought.createParsers(DistortionData);

const thought = T.fromJson.decode({
  uuid: crypto.randomUUID(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: [],
  challenge: "",
  alternativeThought: "",
  v: Thought.VERSION,
});
const key = Thought.key(thought);

const model = {
  thoughts: new Map([[key, thought]]),
  distortionData: DistortionData,
} as any;

const style = {
  text: {},
  flexRow: {},
  h4: {},
  body: {},
  gap1: {},
  rounded: {},
  border: {},
  p2: {},
} as any;

const translate = ((k: string) => k) as any;

// Same hoisting constraint as thought-view-screen.test.tsx: the factory
// can't close over `key`, so route params go through a mock function set
// up after `key` is computed.
const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  return {
    useRouter: () => ({ back: jest.fn() }),
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    Link: React.forwardRef((props: any, ref: any) => {
      const { href, asChild, ...rest } = props;
      // If asChild is true, render children with the props
      if (asChild && props.children) {
        return React.cloneElement(props.children, { ref, accessible: true, ...rest });
      }
      return React.createElement(Pressable, { ref, ...rest });
    }),
    Redirect: ({ href }: { href: string }) => React.createElement(View, { testID: "redirect" }),
    Unmatched: () => React.createElement(View, { testID: "unmatched" }),
  };
});

describe("ThoughtEditScreen", () => {
  it("renders a header above the entry form", () => {
    mockUseLocalSearchParams.mockReturnValue({ idOrKey: thought.uuid, slide: undefined });

    renderWithProviders(
      <ThoughtEditScreen model={model} translate={translate} dispatch={jest.fn()} style={style} />
    );

    expect(screen.getByText("cbt_form.edit")).toBeTruthy();
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy();
  });
});
