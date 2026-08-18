import { act, renderHook, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import { readSrcFile } from "@/tests/support/route-manifest";
import { renderWithProviders } from "@/tests/support/render";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "@/src/features/settings/ui/settings-sheet";

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
    renderWithProviders(
      <SettingsSheet isOpen onOpenChange={jest.fn()} title="Settings">
        <React.Fragment />
      </SettingsSheet>
    );

    const title = screen.getByText("Settings");
    expect(title.props.nativeID).toMatch(/_label$/);
    expect(title.props.accessibilityRole).toBe("header");
    expect(title.props.dynamicTypeRamp).toBe("title3");
    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.getAllByText("Settings")).toHaveLength(1);
    expect(screen.queryByText("Close")).toBeNull();
  });

  it("uses one viewport-centered header band with a trailing 44px close region", () => {
    const source = readSrcFile("features/settings/ui/settings-sheet.tsx");

    expect(source).toContain('<View className="px-4 pt-3">');
    expect(source).toContain('<BottomSheet.Title');
    expect(source).toContain('className="h-11 w-11 items-center justify-center"');
    expect(source.match(/<BottomSheet\.Close/g)).toHaveLength(1);
  });

  it("keeps active settings containers on the shared header", () => {
    const panelShell = readSrcFile("features/settings/ui/settings-panel.tsx");
    expect(panelShell).toMatch(/<SettingsSheet/);

    for (const name of ["appearance-picker.tsx", "journal-picker.tsx"]) {
      expect(readSrcFile(`features/settings/ui/${name}`)).toMatch(/<SettingsSheet/);
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
