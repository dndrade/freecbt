import { fireEvent, screen } from "@testing-library/react-native";
import React from "react";
import { Action } from "@/src/model";
import { LanguagePickerContent } from "@/src/features/settings/ui/language-picker";
import { renderWithProviders } from "@/tests/support/render";

function baseModel() {
  return {
    settings: {
      locale: null,
    },
  } as any;
}

const translate = ((key: string) => key) as any;

describe("LanguagePickerContent", () => {
  const props = {
    model: baseModel(),
    dispatch: jest.fn(),
    translate,
    onBack: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("shows locale choices and returns to General", () => {
    renderWithProviders(<LanguagePickerContent {...props} />);

    expect(screen.getByText("settings.locale.default")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("settings.general.header"));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it("sets the locale and returns to General", () => {
    const calls: string[] = [];
    props.dispatch.mockImplementation(() => calls.push("dispatch"));
    props.onBack.mockImplementation(() => calls.push("back"));

    renderWithProviders(<LanguagePickerContent {...props} />);

    fireEvent.press(screen.getByText("settings.locale.list.en"));
    expect(props.dispatch).toHaveBeenCalledWith(Action.setLocale("en"));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["dispatch", "back"]);
  });
});
