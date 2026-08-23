import { DistortionData, Settings, Thought } from "@/src/model";
import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { StyleSheet } from "react-native";
import { ThoughtListScreen } from "@/src/features/thoughts/thought-list-screen";
import { renderWithProviders } from "@/tests/support/render";

const T = Thought.createParsers(DistortionData);

const thought = T.fromJson.decode({
  uuid: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: ["all-or-nothing"],
  challenge: "chal",
  alternativeThought: "alt",
  v: Thought.VERSION,
});
const key = Thought.key(thought);

const model = {
  thoughts: new Map([[key, thought]]),
  settings: Settings.empty(),
} as any;

const translate = ((k: string) => k) as any;
const mockUseLocalSearchParams = jest.fn(() => ({}));
const mockSetOptions = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("ThoughtListScreen", () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it("sets a headerless-back native header and renders an accessible row", () => {
    renderWithProviders(
      <ThoughtListScreen
        model={model}
        dispatch={jest.fn()}
        translate={translate}
        style={{} as any}
      />,
    );

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ headerTitle: "settings.journal.header" }),
    );
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(
      screen.getByRole("button", {
        name: new RegExp(Thought.label(thought, model)),
      }),
    ).toBeTruthy();
  });

  it("still fires delete from its own button", () => {
    const dispatch = jest.fn();
    renderWithProviders(
      <ThoughtListScreen
        model={model}
        dispatch={dispatch}
        translate={translate}
        style={{} as any}
      />,
    );

    fireEvent.press(
      screen.getByLabelText("accessibility.delete_thought_button"),
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("marks the routed Thought row as selected", () => {
    mockUseLocalSearchParams.mockReturnValue({ idOrKey: thought.uuid });
    renderWithProviders(
      <ThoughtListScreen
        model={model}
        dispatch={jest.fn()}
        translate={translate}
        style={{} as any}
      />,
    );

    const row = screen.getByRole("button", {
      name: new RegExp(Thought.label(thought, model)),
      selected: true,
    });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      borderColor: "#556de5",
      borderWidth: 2,
    });
  });

  it("marks the routed legacy Thought key row as selected", () => {
    mockUseLocalSearchParams.mockReturnValue({ idOrKey: key });
    renderWithProviders(
      <ThoughtListScreen
        model={model}
        dispatch={jest.fn()}
        translate={translate}
        style={{} as any}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: new RegExp(Thought.label(thought, model)),
        selected: true,
      }),
    ).toBeTruthy();
  });
});
