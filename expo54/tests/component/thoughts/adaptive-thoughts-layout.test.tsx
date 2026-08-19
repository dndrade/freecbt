import { AdaptiveThoughtsLayout } from "@/src/features/thoughts/adaptive-thoughts-layout";
import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";

function renderLayout(selectedId: string | null) {
  render(
    <AdaptiveThoughtsLayout
      list={<View testID="journal-pane" />}
      detail={<View testID="detail-pane" />}
      selectedId={selectedId}
    />
  );
}

function resize(width: number) {
  fireEvent(screen.getByTestId("adaptive-thoughts-layout"), "layout", {
    nativeEvent: { layout: { width, height: 700 } },
  });
}

describe("AdaptiveThoughtsLayout", () => {
  it("shows only Journal when no Thought is selected", () => {
    renderLayout(null);
    resize(1000);

    expect(screen.getByTestId("journal-pane")).toBeTruthy();
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
