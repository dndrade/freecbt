import { render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { SupportSheet } from "./support-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  Link: ({ children, ...props }: any) => children,
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
});
