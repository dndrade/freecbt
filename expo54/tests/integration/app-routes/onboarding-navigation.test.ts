import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OnboardingIntro from "@/src/app/v2/(public)/help/intro";
import { OnboardingScreen } from "@/src/features/onboarding/onboarding-screen";

const mockDispatch = jest.fn();
const mockPush = jest.fn();
const mockScrollTo = jest.fn();
const mockHomeV2 = jest.fn(() => "/v2");
const mockThoughtCreateV2 = jest.fn(() => "/v2/thoughts/create");
const mockOnSkip = jest.fn();
const mockFlowCopy: Record<string, string> = {
  "onboarding_screen.previous": "Previous",
  "onboarding_screen.skip": "Skip",
  "onboarding_screen.next": "Next",
  "onboarding_screen.progress": "Onboarding progress",
  "onboarding_screen.progress_step": "Step %{step} of %{count}",
  "onboarding_screen.saving": "Saving…",
  "onboarding_screen.save_failed": "Unable to save. Try again.",
  "onboarding_screen.get_started": "Get started",
};
const mockTranslate = (key: string, values?: Record<string, unknown>) =>
  Object.entries(values ?? {}).reduce(
    (copy, [name, value]) => copy.replace(`%{${name}}`, String(value)),
    mockFlowCopy[key] ?? key
  );
const mockReminders = {
  isSupported: () => remindersSupported,
  enable: jest.fn(),
  disable: jest.fn(),
};
let remindersSupported = true;
let currentIndex = 0;
let renderAllSlides = false;
let onSnapToItem: ((index: number) => void) | undefined;

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

jest.mock("@/src/hooks/use-model", () => ({
  LoadModel: (props: { ready: React.ComponentType<any> }) =>
    React.createElement(props.ready, {
      model: { onboardingCompletion: "idle" },
      dispatch: mockDispatch,
      style: mockStyle,
      translate: mockTranslate,
    }),
}));

jest.mock("@/src", () => ({
  Routes: {
    homeV2: () => mockHomeV2(),
    thoughtCreateV2: () => mockThoughtCreateV2(),
  },
}));

jest.mock("@/src/components", () => ({
  Section: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  FlowProgress: ({
    count,
    currentIndex,
    accessibilityLabel,
    accessibilityValueText,
  }: {
    count: number;
    currentIndex: number;
    accessibilityLabel?: string;
    accessibilityValueText?: string;
  }) =>
    React.createElement(
      View,
      {
        accessibilityRole: "progressbar",
        accessibilityLabel,
        accessibilityValue: { text: accessibilityValueText },
      },
      ...Array.from({ length: count }, (_, index) =>
        React.createElement(View, {
          key: index,
          testID: "segmented-progress-segment",
        })
      ),
      React.createElement(Text, null, `Step ${currentIndex + 1} of ${count}`)
    ),
  FlowAction: (props: {
    state: "next" | "final";
    onPress: () => void;
    isDisabled?: boolean;
    accessibilityLabel: string;
    finalLabel: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: "button",
        disabled: props.isDisabled,
        onPress: props.onPress,
      },
      React.createElement(Text, null, props.state === "final" ? props.finalLabel : "Next")
    ),
}));

jest.mock("@/src/assets/image-path", () => ({
  looker: 1,
  eater: 2,
  logo: 3,
  notifications: 4,
}));

jest.mock("@/src/features/reminders/use-reminders", () => ({
  useReminders: () => mockReminders,
}));

jest.mock("heroui-native", () => ({
  useThemeColor: () => "#fff",
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
    style?: object;
  }) => {
    const role =
      props.accessibilityRole ??
      (props.type?.startsWith("h") ? ("header" as const) : undefined);
    return (
    React.createElement(
      Text,
      {
        accessibilityRole: role,
        style: props.style,
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
    onSnapToItem = props.onSnapToItem;
    const renderedItems = renderAllSlides
      ? props.data.map((item, index) => props.renderItem({ item, index }))
      : [props.renderItem({ item: props.data[currentIndex], index: currentIndex })];
    return React.createElement(View, null, ...renderedItems);
  });
  return {
    __esModule: true,
    default: Carousel,
    Pagination: {
      Basic: () => React.createElement(View, { testID: "legacy-pagination-basic" }),
    },
  };
});

const mockStyle = new Proxy(
  { container: {}, errorText: {}, button: {}, buttonText: {} } as Record<string, object>,
  { get: (target, key: string) => target[key] ?? {} }
);

function intro(
  completion: "idle" | "saving" | { status: "failure"; error: Error } = "idle",
  translate: (key: string, values?: Record<string, unknown>) => string = mockTranslate
) {
  return React.createElement(OnboardingScreen, {
    model: { onboardingCompletion: completion } as never,
    dispatch: mockDispatch,
    style: mockStyle as never,
    translate: translate as never,
    onSkip: mockOnSkip,
  } as never);
}

function renderIntro(
  completion: "idle" | "saving" | { status: "failure"; error: Error } = "idle",
  translate?: (key: string, values?: Record<string, unknown>) => string
) {
  const view = render(intro(completion, translate));
  fireEvent(view.getByTestId("onboarding-pager-viewport"), "layout", {
    nativeEvent: { layout: { width: 400, height: 600 } },
  });
  return view;
}

describe("onboarding navigation", () => {
  beforeEach(() => {
    remindersSupported = true;
    currentIndex = 0;
    renderAllSlides = false;
    onSnapToItem = undefined;
    jest.clearAllMocks();
  });

  it("uses segmented progress with the actual active slide count and no pagination dots", () => {
    remindersSupported = false;
    const view = renderIntro();

    expect(view.getAllByTestId("segmented-progress-segment")).toHaveLength(3);
    expect(view.queryByTestId("legacy-pagination-basic")).toBeNull();
  });

  it("marks the user existing before Skip navigates Home", () => {
    const view = render(React.createElement(OnboardingIntro));

    fireEvent.press(view.getByRole("button", { name: "Skip" }));

    expect(mockDispatch).toHaveBeenCalledWith({ action: "set-existing-user" });
    expect(mockPush).toHaveBeenCalledWith("/v2");
    expect(mockDispatch.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]
    );
  });

  it("keeps accessible Back and Skip controls around the active slide", () => {
    const view = renderIntro();

    expect(view.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(view.getByRole("button", { name: "Skip" })).toHaveStyle({
      width: 44,
      height: 44,
    });
    const next = view.getByRole("button", { name: "Next" });

    fireEvent.press(next);

    const previous = view.getByRole("button", { name: "Previous" });
    expect(previous).toHaveStyle({ width: 44, height: 44 });
    expect(view.getByRole("button", { name: "Next" })).toBeTruthy();
    fireEvent.press(previous);
    expect(mockScrollTo).toHaveBeenCalledWith(1);
    expect(mockScrollTo).toHaveBeenCalledWith(-1);
  });

  it("makes inactive web carousel pages inert", () => {
    const originalPlatform = Platform.OS;
    Platform.OS = "web";
    renderAllSlides = true;

    try {
      const view = renderIntro();
      const page = (id: string) => {
        const wrapper = view
          .UNSAFE_getAllByType(View)
          .find((candidate) => candidate.props.testID === `onboarding-page-${id}`);
        if (!wrapper) throw new Error(`missing onboarding page: ${id}`);
        return wrapper;
      };

      expect(page("record").props.inert).toBeUndefined();
      expect(page("challenge").props.inert).toBe(true);
      expect(page("reminders").props.inert).toBe(true);
    } finally {
      Platform.OS = originalPlatform;
    }
  });

  it("announces each newly settled heading once", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(jest.fn());
    const view = renderIntro("idle", (key) => `translated:${key}`);

    fireEvent.press(view.getByRole("button", { name: "translated:onboarding_screen.next" }));
    act(() => onSnapToItem?.(1));
    fireEvent(view.getByTestId("onboarding-pager-viewport"), "layout", {
      nativeEvent: { layout: { width: 500, height: 600 } },
    });

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      "translated:onboarding_screen.block1.header"
    );
    announce.mockRestore();
  });

  it("uses translated flow chrome and progress copy", () => {
    const copy = {
      "onboarding_screen.previous": "Before",
      "onboarding_screen.skip": "Leave",
      "onboarding_screen.next": "Forward",
      "onboarding_screen.progress": "Setup progress",
      "onboarding_screen.progress_step": "Page 1 of 3",
      "onboarding_screen.saving": "Writing",
      "onboarding_screen.save_failed": "Could not write. Retry.",
      "onboarding_screen.get_started": "Begin",
    } as const;
    const translate = (key: string) => copy[key as keyof typeof copy] ?? key;
    remindersSupported = false;
    const view = renderIntro("idle", translate);

    expect(view.getByRole("button", { name: "Leave" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Forward" })).toBeTruthy();
    expect(view.getByLabelText("Setup progress").props.accessibilityValue).toEqual({
      text: "Page 1 of 3",
    });

    fireEvent.press(view.getByRole("button", { name: "Forward" }));
    expect(view.getByRole("button", { name: "Before" })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Forward" }));
    expect(view.getByRole("button", { name: "Begin" })).toBeTruthy();

    view.rerender(intro("saving", translate));
    expect(view.getByRole("button", { name: "Writing" })).toBeTruthy();
    view.rerender(intro({ status: "failure", error: new Error("failed") }, translate));
    expect(view.getByText("Could not write. Retry.")).toBeTruthy();
  });

  it("keeps Get started as the final onboarding action", () => {
    remindersSupported = false;
    const view = renderIntro();

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));

    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Next" })).toBeNull();
    expect(view.queryByRole("button", { name: "Previous" })).toBeTruthy();
  });

  it("renders accessible onboarding hierarchy with a labeled help link", () => {
    const view = renderIntro();

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
    remindersSupported = false;
    const view = renderIntro();

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));

    const [slideScrollView] = view.UNSAFE_getAllByType(ScrollView);
    expect(slideScrollView.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
  });

  it("keeps supported reminder choices persistence-only before completion", () => {
    const view = renderIntro();

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
    const supportedView = renderIntro();
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    fireEvent.press(supportedView.getByRole("button", { name: "Next" }));
    expect(
      supportedView.queryAllByRole("button", { name: "Get started" })
    ).toHaveLength(1);

    remindersSupported = false;
    currentIndex = 0;
    const unsupportedView = renderIntro();
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
    const view = renderIntro("idle");

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

  it("shows completion failures only on the final page without changing failure chrome height", () => {
    remindersSupported = false;
    const view = renderIntro({ status: "failure", error: new Error("failed") });
    const failureRegion = () =>
      view.UNSAFE_getByProps({ testID: "onboarding-failure-region" });
    const failureText = () => {
      const text = view
        .UNSAFE_getAllByType(Text)
        .find((candidate) => candidate.props.children === "Unable to save. Try again.");
      if (!text) throw new Error("missing failure text");
      return text;
    };

    expect(failureRegion().props.accessibilityElementsHidden).toBe(true);
    expect(failureText().props.style).toEqual({ opacity: 0 });

    fireEvent.press(view.getByRole("button", { name: "Next" }));
    fireEvent.press(view.getByRole("button", { name: "Next" }));
    expect(failureRegion().props.accessibilityElementsHidden).toBe(false);
    expect(failureText().props.style).toEqual({ opacity: 1 });

    fireEvent.press(view.getByRole("button", { name: "Previous" }));
    expect(failureRegion().props.accessibilityElementsHidden).toBe(true);
    expect(failureText().props.style).toEqual({ opacity: 0 });
  });

  it("waits for the supported completion result before routing home", () => {
    const view = renderIntro("idle");

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
