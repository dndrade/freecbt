import { AdaptiveThoughtsLayout } from "@/src/features/thoughtRecord/screens/AdaptiveThoughtsLayout";
import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Text, View } from "react-native";
import { renderWithProviders } from "@/tests/support/render";

function renderLayout(
  selectedId: string | null,
  hasThoughts = true,
  list = <View testID="journal-pane" />,
) {
  renderWithProviders(
    <AdaptiveThoughtsLayout
      list={list}
      detail={<View testID="detail-pane" />}
      selectedId={selectedId}
      hasThoughts={hasThoughts}
      selectThoughtText="Select a thought"
    />,
  );
}

function resize(width: number) {
  fireEvent(screen.getByTestId("adaptive-thoughts-layout"), "layout", {
    nativeEvent: { layout: { width, height: 700 } },
  });
}

describe("AdaptiveThoughtsLayout", () => {
  it("shows only Journal when no Thought is selected in compact mode", () => {
    renderLayout(null);
    resize(500);

    expect(screen.getByTestId("journal-pane")).toBeTruthy();
    expect(screen.queryByTestId("detail-pane")).toBeNull();
    expect(screen.queryByText("Select a thought")).toBeNull();
  });

  it("shows a detail placeholder beside nonempty Journal when no Thought is selected in wide mode", () => {
    renderLayout(null);
    resize(1000);

    expect(screen.getByTestId("journal-pane")).toBeTruthy();
    expect(screen.getByText("Select a thought")).toBeTruthy();
    expect(screen.queryByTestId("detail-pane")).toBeNull();
  });

  it("shows only empty Journal when no Thought exists in wide mode", () => {
    renderLayout(null, false, <Text>No thoughts yet!</Text>);
    resize(1000);

    expect(screen.getByText("No thoughts yet!")).toBeTruthy();
    expect(screen.queryByText("Select a thought")).toBeNull();
    expect(screen.queryByTestId("detail-pane")).toBeNull();
  });

  it("shows only the selected detail when compact", () => {
    renderLayout("thought-1");
    resize(500);

    expect(screen.queryByTestId("journal-pane")).toBeNull();
    expect(screen.getByTestId("detail-pane")).toBeTruthy();
  });

  it("shows the detail beside Journal when the parent can fit both panes", () => {
    renderLayout("thought-1");
    resize(1000);

    expect(screen.getByTestId("journal-pane")).toBeTruthy();
    expect(screen.getByTestId("detail-pane")).toBeTruthy();
  });

  it("keeps the selected detail visible when the measured width changes", () => {
    renderLayout("thought-1");
    resize(1000);
    resize(500);

    expect(screen.queryByTestId("journal-pane")).toBeNull();
    expect(screen.getByTestId("detail-pane")).toBeTruthy();
  });
});
