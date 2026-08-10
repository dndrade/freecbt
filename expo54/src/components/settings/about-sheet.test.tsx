import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useRouter } from "expo-router";
import React from "react";
import { AboutSheet } from "./about-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  Link: ({ children }: any) => children,
}));

const translate = ((key: string) => key) as any;

describe("AboutSheet", () => {
  it("reveals the debug row after 5 taps on the version row, hidden before that", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    render(
      <HeroUINativeProvider>
        <AboutSheet isOpen onOpenChange={jest.fn()} translate={translate} />
      </HeroUINativeProvider>
    );

    expect(screen.queryByText("developer debug page")).toBeNull();

    const versionRow = screen.getByText(/settings.about.version/);
    for (let i = 0; i < 5; i++) {
      fireEvent.press(versionRow);
    }

    expect(screen.getByText("developer debug page")).toBeTruthy();
  });

  it("shows the acknowledgements placeholder in place, without navigating", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const onOpenChange = jest.fn();

    render(
      <HeroUINativeProvider>
        <AboutSheet isOpen onOpenChange={onOpenChange} translate={translate} />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.about.acknowledgements.label"));
    expect(screen.getByText("settings.about.acknowledgements.todo")).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
