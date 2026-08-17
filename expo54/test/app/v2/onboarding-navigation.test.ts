import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { OnboardingScreen } from "@/src/features/onboarding/onboarding-screen";

const mockDispatch = jest.fn();
const mockPush = jest.fn();
const mockScrollTo = jest.fn();
const mockHomeV2 = jest.fn(() => "/v2");
const mockThoughtCreateV2 = jest.fn(() => "/v2/thoughts/create");
const mockReminders = {
  isSupported: () => remindersSupported,
  enable: jest.fn(),
  disable: jest.fn(),
};
let remindersSupported = true;
let currentIndex = 0;
let mockWindowHeight = 800;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: (props: {
    asChild?: boolean;
    children: React.ReactNode;
    accessibilityLabel?: string;
  }) => {
    if (props.asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as React.ReactElement<any>, {
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: "link",
      });
    }
    return React.createElement(
      View,
      {
        accessibilityRole: "link",
        accessibilityLabel: props.accessibilityLabel,
      },
      props.children
    );
  },
}));

jest.mock("@/src", () => ({
  Routes: {
    homeV2: () => mockHomeV2(),
    thoughtCreateV2: () => mockThoughtCreateV2(),
  },
}));

jest.mock("@/src/components", () => ({
  ImagePath: { looker: 1, eater: 2, logo: 3, notifications: 4 },
  Screen: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  Section: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  SegmentedProgress: ({
    count,
    currentIndex,
    accessibilityLabel,
  }: {
    count: number;
    currentIndex: number;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      View,
      { accessibilityRole: "progressbar", accessibilityLabel },
      ...Array.from({ length: count }, (_, index) =>
        React.createElement(View, {
          key: index,
          testID: "segmented-progress-segment",
        })
      ),
      React.createElement(Text, null, `Step ${currentIndex + 1} of ${count}`)
    ),
}));

jest.mock("@/src/features/reminders/use-reminders", () => ({
  useReminders: () => mockReminders,
}));

jest.mock("@/src/hooks/use-safe-area", () => ({
  useSafeWindowDimensions: () => ({ width: 400, height: mockWindowHeight }),
}));

jest.mock("heroui-native", () => ({
  Button: (props: {
    children: React.ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
  }) => {
    const accessibilityLabel =
      typeof props.children === "string" ? props.children : undefined;
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel,
        accessibilityRole: "button",
        disabled: props.isDisabled,
        onPress: props.onPress,
      },
      props.children
    );
  },
  Typography: (props: {
    children: React.ReactNode;
    type?: string;
    accessibilityRole?: "header";
  }) => {
    const role =
      props.accessibilityRole ??
      (props.type?.startsWith("h") ? ("header" as const) : undefined);
    return (
    React.createElement(
      Text,
      {
        accessibilityRole: role,
      },
      props.children
    )
  );
  },
}));

jest.mock("react-native-reanimated", () => ({
  useSharedValue: () => ({ value: currentIndex }),
}));

jest.mock("react-native-reanimated-carousel", () => {
  const Carousel = React.forwardRef(function Carousel(
    props: {
      data: readonly string[];
      renderItem: (props: { item: string; index: number }) => React.ReactNode;
      onSnapToItem?: (index: number) => void;
    },
    ref
  ) {
    React.useImperativeHandle(ref, () => ({
      scrollTo: ({ count }: { count: number }) => {
        currentIndex += count;
        mockScrollTo(count);
        props.onSnapToItem?.(currentIndex);
      },
    }));
    const item = props.data[currentIndex];
    return React.createElement(
      View,
      null,
      props.renderItem({ item, index: currentIndex })
    );
  });
  return {
    __esModule: true,
    default: Carousel,
    Pagination: {
      Basic: () => React.createElement(View, { testID: "legacy-pagination-basic" }),
    },
  };
});

const style = new Proxy(
  { container: {}, errorText: {}, button: {}, buttonText: {} } as Record<string, object>,
  { get: (target, key: string) => target[key] ?? {} }
);

function intro(
  completion: "idle" | "saving" | { status: "failure"; error: Error } = "idle"
) {
  return React.createElement(OnboardingScreen, {
    model: { onboardingCompletion: completion } as never,
    dispatch: mockDispatch,
    style: style as never,
    translate: ((key: string) => key) as never,
  });
}

describe("onboarding navigation", () => {
  beforeEach(() => {
    remindersSupported = true;
    currentIndex = 0;
    mockWindowHeight = 800;
    jest.clearAllMocks();
  });

  it("uses segmented progress with the actual active slide count and no pagination dots", () => {
    remindersSupported = false;
    const view = render(intro());

    expect(view.getAllByTestId("segmented-progress-segment")).toHaveLength(3);
    expect(view.queryByTestId("legacy-pagination-basic")).toBeNull();
  });

  it("shows accessible 44 by 44 step controls around the active slide", () => {
    const view = render(intro());

    expect(view.queryByRole("button", { name: "Previous" })).toBeNull();
    const next = view.getByRole("button", { name: "Next" });
    expect(next).toHaveStyle({ width: 44, height: 44 });

    fireEvent.press(next);

    const previous = view.getByRole("button", { name: "Previous" });
    expect(previous).toHaveStyle({ width: 44, height: 44 });
    expect(view.getByRole("button", { name: "Next" })).toBeTruthy();
    fireEvent.press(previous);
    expect(mockScrollTo).toHaveBeenCalledWith(1);
    expect(mockScrollTo).toHaveBeenCalledWith(-1);
  });

  it("keeps Get started as the final onboarding action", () => {
    remindersSupported = false;
    const view = render(intro());

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));

    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Next" })).toBeNull();
    expect(view.queryByRole("button", { name: "Previous" })).toBeTruthy();
  });

  it("renders accessible onboarding hierarchy with a labeled help link", () => {
    const view = render(intro());

    expect(view.getByLabelText("Onboarding progress")).toBeTruthy();
    expect(view.getByRole("header", { name: "onboarding_screen.readme" })).toBeTruthy();
    expect(view.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(
      view.UNSAFE_getByProps({
        accessibilityLabel: "onboarding_screen.header",
        accessibilityRole: "link",
      })
    ).toBeTruthy();
  });

  it("keeps each slide in a scroll container for tight heights", () => {
    mockWindowHeight = 320;
    remindersSupported = false;
    const view = render(intro());

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));

    const [slideScrollView] = view.UNSAFE_getAllByType(ScrollView);
    expect(slideScrollView.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
  });

  it("keeps supported reminder choices persistence-only before completion", () => {
    const view = render(intro());

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));

    fireEvent.press(
      view.getByRole("button", { name: "onboarding_screen.reminders.button.yes" })
    );
    expect(mockReminders.enable).toHaveBeenCalledWith(
      mockDispatch,
      expect.any(Function)
    );
    expect(mockDispatch).not.toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(
      view.getByRole("button", { name: "onboarding_screen.reminders.button.no" })
    ).toBeTruthy();

    fireEvent.press(
      view.getByRole("button", { name: "onboarding_screen.reminders.button.no" })
    );
    expect(mockReminders.disable).toHaveBeenCalledWith(mockDispatch);
    expect(mockDispatch).not.toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(
      view.getByRole("button", { name: "onboarding_screen.reminders.button.yes" })
    ).toBeTruthy();
  });

  it("uses Get started as the single completion affordance on supported and unsupported flows", () => {
    const supportedView = render(intro());
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    expect(
      supportedView.queryAllByRole("button", { name: "Get started" })
    ).toHaveLength(1);

    remindersSupported = false;
    currentIndex = 0;
    const unsupportedView = render(intro());
    fireEvent.press(unsupportedView.getByRole("button", { name: "Next" }));
    fireEvent.press(unsupportedView.getByRole("button", { name: "Next" }));

    expect(
      unsupportedView.queryAllByRole("button", { name: "Get started" })
    ).toHaveLength(1);
    expect(unsupportedView.queryByRole("button", { name: "Next" })).toBeNull();
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();
  });

  it("waits for the completion result before routing home and keeps failures retryable", () => {
    remindersSupported = false;
    const view = render(intro("idle"));

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Get started" }));

    expect(mockDispatch).toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();

    view.rerender(intro("saving"));
    const savingButton = view.getByRole("button", { name: "Saving…" }) as {
      props: { accessibilityState?: { disabled?: boolean } };
    };
    expect(savingButton.props.accessibilityState?.disabled).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();

    view.rerender(intro({ status: "failure", error: new Error("failed") }));
    expect(view.getByText("Unable to save. Try again.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Get started" }));
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockHomeV2).not.toHaveBeenCalled();

    view.rerender(intro("idle"));
    act(() => undefined);

    expect(mockHomeV2).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/v2");
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();
  });

  it("waits for the supported completion result before routing home", () => {
    const view = render(intro("idle"));

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Get started" }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();

    view.rerender(intro("saving"));
    expect(
      (view.getByRole("button", { name: "Saving…" }) as {
        props: { accessibilityState?: { disabled?: boolean } };
      }).props.accessibilityState?.disabled
    ).toBe(true);

    view.rerender(intro("idle"));
    act(() => undefined);

    expect(mockHomeV2).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/v2");
    expect(mockThoughtCreateV2).not.toHaveBeenCalled();
  });
});
