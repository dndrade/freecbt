import { act, render, renderHook, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { readFileSync } from "node:fs";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "./settings-sheet";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

describe("useResetOnDismiss", () => {
  it("calls reset the render after isOpen transitions from true to false", () => {
    const reset = jest.fn();
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => useResetOnDismiss(isOpen, reset),
      { initialProps: { isOpen: true } }
    );
    expect(reset).not.toHaveBeenCalled();

    rerender({ isOpen: false });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not call reset while isOpen stays the same across rerenders", () => {
    const reset = jest.fn();
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => useResetOnDismiss(isOpen, reset),
      { initialProps: { isOpen: false } }
    );
    rerender({ isOpen: false });
    expect(reset).not.toHaveBeenCalled();
  });

  it("does not call reset when isOpen transitions from false to true", () => {
    const reset = jest.fn();
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => useResetOnDismiss(isOpen, reset),
      { initialProps: { isOpen: false } }
    );
    rerender({ isOpen: true });
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("SettingsSheet", () => {
  it("renders one compact title/close header with an accessible Close action", () => {
    render(
      <HeroUINativeProvider>
        <SettingsSheet isOpen onOpenChange={jest.fn()} title="Settings">
          <React.Fragment />
        </SettingsSheet>
      </HeroUINativeProvider>
    );

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.getAllByText("Settings")).toHaveLength(1);
    expect(screen.queryByText("Close")).toBeNull();
  });

  it("uses one viewport-centered header band with a trailing 44px close region", () => {
    const source = readFileSync(__filename.replace(/\.test\.tsx$/, ".tsx"), "utf8");

    expect(source).toMatch(/<View className="flex-row items-center">\s*<View className="min-w-11" \/>\s*<View className="flex-1 items-center">\s*<BottomSheet\.Title className="text-foreground">/s);
    expect(source).toMatch(/<View className="min-w-11" \/>[\s\S]*<BottomSheet\.Close[\s\S]*className="min-h-11 min-w-11 items-center justify-center"/);
    expect(source.match(/<BottomSheet\.Close/g)).toHaveLength(1);
  });

  it("keeps every settings sheet on the shared header", () => {
    const settings = [
      "general-sheet.tsx",
      "data-sheet.tsx",
      "wellbeing-sheet.tsx",
      "support-sheet.tsx",
      "about-sheet.tsx",
      "appearance-picker.tsx",
      "journal-picker.tsx",
    ];

    for (const name of settings) {
      expect(readFileSync(`${__dirname}/${name}`, "utf8")).toMatch(/<SettingsSheet/);
    }
  });
});

describe("useDismissThenNavigate", () => {
  it("requests close immediately, but navigates only once onClosed fires", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const onOpenChange = jest.fn();

    const { result } = renderHook(() => useDismissThenNavigate(onOpenChange));

    act(() => {
      result.current.dismissThenNavigate("/v2/settings/lock");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).not.toHaveBeenCalled();

    act(() => {
      result.current.onClosed();
    });
    expect(push).toHaveBeenCalledWith("/v2/settings/lock");
  });

  it("onClosed is a no-op when nothing is pending", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const { result } = renderHook(() => useDismissThenNavigate(jest.fn()));

    act(() => {
      result.current.onClosed();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("clears the pending href after navigating, so a second onClosed is a no-op", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const { result } = renderHook(() => useDismissThenNavigate(jest.fn()));

    act(() => {
      result.current.dismissThenNavigate("/v2/settings/lock");
      result.current.onClosed();
    });
    push.mockClear();

    act(() => {
      result.current.onClosed();
    });
    expect(push).not.toHaveBeenCalled();
  });
});
