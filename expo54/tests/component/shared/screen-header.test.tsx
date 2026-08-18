import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { ScreenHeader } from "@/src/components/layout/screen-header";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe("ScreenHeader", () => {
  it("does not expose a back button for the root Settings destination", () => {
    render(
      <HeroUINativeProvider>
        <ScreenHeader title="Settings" showBack={false} />
      </HeroUINativeProvider>
    );

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("exposes an accessible back button when enabled", () => {
    render(
      <HeroUINativeProvider>
        <ScreenHeader title="Settings" />
      </HeroUINativeProvider>
    );

    fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Settings")).toBeTruthy();
  });
});
