import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { JournalPicker } from "./journal-picker";

const translate = ((key: string) => key) as any;

describe("JournalPicker", () => {
  it("dispatches setHistoryLabel and closes when a label is chosen", () => {
    const dispatch = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <HeroUINativeProvider>
        <JournalPicker
          isOpen
          onOpenChange={onOpenChange}
          model={{ settings: { historyLabels: "alternative-thought" } } as any}
          dispatch={dispatch}
          translate={translate}
        />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.history.button.automatic"));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
