import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useRouter } from "expo-router";
import React from "react";
import { DataSheet } from "./data-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

const translate = ((key: string) => key) as any;

describe("DataSheet", () => {
  it("dismisses then navigates to Backup when pressed", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const onOpenChange = jest.fn();

    render(
      <HeroUINativeProvider>
        <DataSheet isOpen onOpenChange={onOpenChange} translate={translate} />
      </HeroUINativeProvider>
    );

    act(() => {
      fireEvent.press(screen.getByText("settings.data.backup.label"));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).not.toHaveBeenCalled();
  });
});
