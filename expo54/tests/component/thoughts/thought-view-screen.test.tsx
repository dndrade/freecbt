import { DistortionData, Thought } from "@/src/model";
import { screen } from "@testing-library/react-native";
import React from "react";
import { ThoughtViewScreen } from "@/src/features/thoughts/thought-view-screen";
import { renderWithProviders } from "@/tests/support/render";

const T = Thought.createParsers(DistortionData);

const thought = T.fromJson.decode({
  uuid: crypto.randomUUID(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "I'll never finish this",
  cognitiveDistortions: ["all-or-nothing"],
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

const translate = ((k: string) => {
  const translations: Record<string, string> = {
    "accessibility.thought_field_not_set": "Not set",
    auto_thought: "auto_thought",
    challenge: "challenge",
    cog_distortion: "cog_distortion",
    alt_thought: "alt_thought",
    all_or_nothing_thinking: "all_or_nothing_thinking",
  };
  return translations[k] ?? k;
}) as any;

// jest.mock factories can only reference `mock`-prefixed bindings (Jest
// hoists the factory above every other const in this file), so the route
// param is supplied through a mock function set up before each render.
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
        return React.cloneElement(props.children, { ref, ...rest });
      }
      return React.createElement(Pressable, { ref, ...rest });
    }),
    Redirect: ({ href }: { href: string }) =>
      React.createElement(View, { testID: "redirect" }),
    Unmatched: () => React.createElement(View, { testID: "unmatched" }),
  };
});

describe("ThoughtViewScreen", () => {
  it("renders inline back navigation and value-aware accessible labels for each field", () => {
    mockUseLocalSearchParams.mockReturnValue({ idOrKey: thought.uuid });

    renderWithProviders(
      <ThoughtViewScreen
        model={model}
        translate={translate}
        dispatch={jest.fn()}
        style={style}
      />,
    );

    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /auto_thought.*I'll never finish this/,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /challenge.*Not set/ }),
    ).toBeTruthy();
  });
});
