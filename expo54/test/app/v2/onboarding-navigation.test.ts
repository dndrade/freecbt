import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { Ready } from "@/src/app/v2/(public)/help/intro";

const mockDispatch = jest.fn();
const mockScrollTo = jest.fn();
let remindersSupported = true;
let currentIndex = 0;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
}));

jest.mock("@/src", () => ({
  Routes: { homeV2: () => "/v2" },
}));

jest.mock("@/src/components", () => ({
  ImagePath: { looker: 1, eater: 2, logo: 3, notifications: 4 },
  SegmentedProgress: ({ count, currentIndex }: { count: number; currentIndex: number }) =>
    React.createElement(
      View,
      { accessibilityRole: "progressbar" },
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
  useReminders: () => ({
    isSupported: () => remindersSupported,
    enable: jest.fn(),
    disable: jest.fn(),
  }),
}));

jest.mock("@/src/hooks/use-safe-area", () => ({
  useSafeWindowDimensions: () => ({ width: 400, height: 800 }),
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

function intro() {
  return React.createElement(Ready, {
    model: { onboardingCompletion: "idle" } as never,
    dispatch: mockDispatch,
    style: style as never,
    translate: ((key: string) => key) as never,
  });
}

describe("onboarding navigation", () => {
  beforeEach(() => {
    remindersSupported = true;
    currentIndex = 0;
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

    expect(view.getByText("Get started")).toBeTruthy();
    expect(view.queryByRole("button", { name: "Next" })).toBeNull();
    expect(view.queryByRole("button", { name: "Previous" })).toBeTruthy();
  });
});
