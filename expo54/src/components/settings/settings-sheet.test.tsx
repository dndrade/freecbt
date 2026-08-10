import { act, renderHook } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { useDismissThenNavigate, useResetOnDismiss } from "./settings-sheet";

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
