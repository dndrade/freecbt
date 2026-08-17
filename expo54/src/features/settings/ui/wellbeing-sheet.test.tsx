import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useRouter } from "expo-router";
import React from "react";
import { WellbeingSheet } from "./wellbeing-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

const translate = ((key: string) => key) as any;

describe("WellbeingSheet", () => {
  it("shows the crisis-lines placeholder in place, without navigating", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const onOpenChange = jest.fn();

    render(
      <HeroUINativeProvider>
        <WellbeingSheet isOpen onOpenChange={onOpenChange} translate={translate} />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByText("settings.wellbeing.crisis.label"));
    expect(screen.getByText("settings.wellbeing.crisis.todo")).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
