import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { AppearancePicker } from "@/src/features/settings/ui/appearance-picker";

const translate = ((key: string) => key) as any;

describe("AppearancePicker", () => {
  it("dispatches setTheme and closes when a theme is chosen", () => {
    const dispatch = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <HeroUINativeProvider>
        <AppearancePicker
          isOpen
          onOpenChange={onOpenChange}
          model={{ settings: { theme: null } } as any}
          dispatch={dispatch}
          translate={translate}
        />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.theme.dark"));

    expect(dispatch).toHaveBeenCalledWith({ action: "set-theme", value: "dark" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
