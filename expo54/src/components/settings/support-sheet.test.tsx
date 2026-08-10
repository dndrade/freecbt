import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { Linking } from "react-native";
import { SupportSheet } from "./support-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  Link: ({ children, href, ...props }: any) => {
    const { Pressable } = jest.requireActual("react-native") as typeof import("react-native");
    return (
      <Pressable testID={String(href)} {...props}>
        {children}
      </Pressable>
    );
  },
}));

const translate = ((key: string) => key) as any;

describe("SupportSheet", () => {
  it("renders all five external-link rows", () => {
    render(
      <HeroUINativeProvider>
        <SupportSheet isOpen onOpenChange={jest.fn()} translate={translate} />
      </HeroUINativeProvider>
    );
    expect(screen.getByText("settings.support.help.label")).toBeTruthy();
    expect(screen.getByText("settings.support.contact.label")).toBeTruthy();
    expect(screen.getByText("settings.support.issue.label")).toBeTruthy();
    expect(screen.getByText("settings.privacy")).toBeTruthy();
    expect(screen.getByText("settings.terms")).toBeTruthy();
  });

  it("uses distinct exact destinations for Contact Us and Report an issue", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(
      <HeroUINativeProvider>
        <SupportSheet isOpen onOpenChange={jest.fn()} translate={translate} />
      </HeroUINativeProvider>
    );

    expect(screen.getByTestId("https://github.com/erosson/freecbt/issues")).toBeTruthy();
    fireEvent.press(screen.getByText("settings.support.contact.label"));
    expect(openURL).toHaveBeenLastCalledWith("mailto:freecbt@erosson.org");
    openURL.mockRestore();
  });
});
