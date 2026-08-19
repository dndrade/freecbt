import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { JournalPicker } from "@/src/features/settings/ui/journal-picker";
import { renderWithProviders } from "@/tests/support/render";

const translate = ((key: string) => key) as any;

describe("JournalPicker", () => {
  it("dispatches setHistoryLabel and closes when a label is chosen", () => {
    const dispatch = jest.fn();
    const onOpenChange = jest.fn();
    renderWithProviders(
      <JournalPicker
        isOpen
        onOpenChange={onOpenChange}
        model={{ settings: { historyLabels: "alternative-thought" } } as any}
        dispatch={dispatch}
        translate={translate}
      />
    );

    fireEvent.press(screen.getByText("settings.history.button.automatic"));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
