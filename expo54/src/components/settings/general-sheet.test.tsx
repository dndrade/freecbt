import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { GeneralSheet } from "./general-sheet";

function baseModel(overrides?: Partial<{ reminders: boolean; pincode: string | null; locale: string | null }>) {
  return {
    settings: {
      reminders: false,
      pincode: null,
      locale: null,
      ...overrides,
    },
  } as any;
}

const translate = ((key: string) => key) as any;

describe("GeneralSheet", () => {
  it("shows the root rows when open", () => {
    render(
      <HeroUINativeProvider>
        <GeneralSheet
          isOpen
          onOpenChange={jest.fn()}
          model={baseModel()}
          dispatch={jest.fn()}
          translate={translate}
        />
      </HeroUINativeProvider>
    );
    expect(screen.getByText("settings.general.notifications.label")).toBeTruthy();
    expect(screen.getByText("settings.general.applock.label")).toBeTruthy();
    expect(screen.getByText("settings.general.language.label")).toBeTruthy();
  });

  it("switches to the language view and back without closing the sheet", () => {
    render(
      <HeroUINativeProvider>
        <GeneralSheet
          isOpen
          onOpenChange={jest.fn()}
          model={baseModel()}
          dispatch={jest.fn()}
          translate={translate}
        />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.general.language.label"));
    expect(screen.getByText("settings.locale.default")).toBeTruthy();
    expect(screen.queryByText("settings.general.notifications.label")).toBeNull();

    fireEvent.press(screen.getByText("settings.general.header"));
    expect(screen.getByText("settings.general.notifications.label")).toBeTruthy();
  });

  it("resets to the root view when the sheet is dismissed and reopened", () => {
    const { rerender } = render(
      <HeroUINativeProvider>
        <GeneralSheet
          isOpen
          onOpenChange={jest.fn()}
          model={baseModel()}
          dispatch={jest.fn()}
          translate={translate}
        />
      </HeroUINativeProvider>
    );
    fireEvent.press(screen.getByText("settings.general.language.label"));
    expect(screen.getByText("settings.locale.default")).toBeTruthy();

    rerender(
      <HeroUINativeProvider>
        <GeneralSheet
          isOpen={false}
          onOpenChange={jest.fn()}
          model={baseModel()}
          dispatch={jest.fn()}
          translate={translate}
        />
      </HeroUINativeProvider>
    );
    rerender(
      <HeroUINativeProvider>
        <GeneralSheet
          isOpen
          onOpenChange={jest.fn()}
          model={baseModel()}
          dispatch={jest.fn()}
          translate={translate}
        />
      </HeroUINativeProvider>
    );

    expect(screen.getByText("settings.general.notifications.label")).toBeTruthy();
    // "settings.locale.default" is unsuitable here: with locale: null, that exact
    // string is also the Language row's current-value text in the root view, so it
    // stays present regardless of which nested view is showing. Use the language
    // view's footer copy instead — it renders only in the "language" view.
    expect(screen.queryByText("settings.locale.contribute")).toBeNull();
  });
});
