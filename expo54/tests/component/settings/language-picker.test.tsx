import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { Action } from "@/src/model";
import { LanguagePicker } from "@/src/features/settings/ui/language-picker";

function baseModel() {
  return {
    settings: {
      locale: null,
    },
  } as any;
}

const translate = ((key: string) => key) as any;

describe("LanguagePicker", () => {
  const props = {
    onOpenChange: jest.fn(),
    model: baseModel(),
    dispatch: jest.fn(),
    translate,
    onBack: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("shows locale choices and returns to General", () => {
    render(
      <HeroUINativeProvider>
        <LanguagePicker isOpen {...props} />
      </HeroUINativeProvider>
    );

    expect(screen.getByText("settings.locale.default")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("settings.general.header"));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it("sets the locale and returns to General", () => {
    const calls: string[] = [];
    props.dispatch.mockImplementation(() => calls.push("dispatch"));
    props.onBack.mockImplementation(() => calls.push("back"));

    render(
      <HeroUINativeProvider>
        <LanguagePicker isOpen {...props} />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.locale.list.en"));
    expect(props.dispatch).toHaveBeenCalledWith(Action.setLocale("en"));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["dispatch", "back"]);
  });
});
