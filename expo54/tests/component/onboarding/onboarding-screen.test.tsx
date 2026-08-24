import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { OnboardingScreen } from "@/src/features/onboarding/screens/OnboardingScreen";
import { useOnboardingFlow } from "@/src/features/onboarding/store/useOnboardingFlow";

const mockErrorBoundary = jest.fn(
  (props: { children: React.ReactNode }) => props.children,
);
const onSkip = jest.fn();
const onComplete = jest.fn();
const defaultFinish = useOnboardingFlow.getState().finish;
let mockHeaderRightElement: React.ReactNode;

function renderScreen() {
  return render(<OnboardingScreen onSkip={onSkip} onComplete={onComplete} />);
}

jest.mock("@/shared/components", () => ({
  Section: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
  StandardScreen: (props: {
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    React.createElement(
      View,
      null,
      mockHeaderRightElement ?? null,
      React.createElement(View, null, props.children),
      props.footer ? React.createElement(View, null, props.footer) : null,
    ),
  backHeaderAction: (onPress: () => void) => ({ onPress }),
  useScreenHeader: (options: { rightElement?: React.ReactNode }) => {
    mockHeaderRightElement = options.rightElement;
  },
  FlowProgress: ({
    count,
    currentIndex,
  }: {
    count: number;
    currentIndex: number;
  }) => React.createElement(Text, null, `Step ${currentIndex + 1} of ${count}`),
  FlowAction: (props: {
    state: "next" | "final";
    onPress: () => void;
    accessibilityLabel: string;
    finalLabel: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        accessibilityRole: "button",
        accessibilityLabel: props.accessibilityLabel,
        onPress: props.onPress,
      },
      React.createElement(
        Text,
        null,
        props.state === "final" ? props.finalLabel : "Next",
      ),
    ),
  ErrorBoundary: (props: { children: React.ReactNode }) => {
    mockErrorBoundary(props);
    return props.children;
  },
}));

jest.mock("@/src/features/reminders/use-reminders", () => ({
  useReminders: () => ({
    isSupported: () => false,
    enable: jest.fn(),
    disable: jest.fn(),
  }),
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("@/src/features/settings/hooks/useSettings", () => ({
  useSettings: Object.assign(jest.fn(), {
    getState: () => ({ completeOnboarding: jest.fn() }),
  }),
}));

jest.mock("@/src/assets/image-path", () => ({
  looker: 1,
  eater: 2,
  logo: 3,
  notifications: 4,
}));

jest.mock("heroui-native", () => ({
  useThemeColor: () => "#fff",
  Typography: (props: { children: React.ReactNode }) =>
    React.createElement(Text, null, props.children),
  Button: (props: { children: React.ReactNode; onPress?: () => void }) =>
    React.createElement(
      TouchableOpacity,
      { onPress: props.onPress },
      props.children,
    ),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  Link: (props: { children: React.ReactNode }) => props.children,
}));

jest.mock("react-native-reanimated-carousel", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Carousel = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ scrollTo: () => {} }));
    return React.createElement(
      View,
      null,
      props.data.map((item: unknown, index: number) =>
        props.renderItem({ item, index }),
      ),
    );
  });
  return { __esModule: true, default: Carousel };
});

describe("OnboardingScreen", () => {
  beforeEach(() => {
    useOnboardingFlow.setState({
      activeIndex: 0,
      completion: "idle",
      reminderChoice: null,
      finish: defaultFinish,
    });
    onSkip.mockReset();
    onComplete.mockReset();
    mockErrorBoundary.mockClear();
    mockHeaderRightElement = null;
  });

  it("renders every step from the registry when the pager has laid out", () => {
    renderScreen();
    fireEvent(screen.getByTestId("onboarding-pager-viewport"), "layout", {
      nativeEvent: { layout: { width: 400, height: 600 } },
    });
    expect(
      screen.UNSAFE_getByProps({ testID: "onboarding-page-record" }),
    ).toBeTruthy();
    expect(
      screen.UNSAFE_getByProps({ testID: "onboarding-page-challenge" }),
    ).toBeTruthy();
    expect(
      screen.UNSAFE_getByProps({ testID: "onboarding-page-change" }),
    ).toBeTruthy();
    expect(
      screen.UNSAFE_queryByProps({ testID: "onboarding-page-reminders" }),
    ).toBeNull();
  });

  it("wraps each rendered step in its own ErrorBoundary", () => {
    renderScreen();
    fireEvent(screen.getByTestId("onboarding-pager-viewport"), "layout", {
      nativeEvent: { layout: { width: 400, height: 600 } },
    });
    expect(mockErrorBoundary).toHaveBeenCalledTimes(3);
    for (const [props] of mockErrorBoundary.mock.calls) {
      expect(props).toEqual(
        expect.objectContaining({
          fallback: null,
          onError: expect.any(Function),
        }),
      );
    }
  });

  it("persists before invoking the Skip callback", async () => {
    let resolveFinish!: () => void;
    const finish = jest.fn(
      () => new Promise<void>((resolve) => (resolveFinish = resolve)),
    );
    useOnboardingFlow.setState({ finish });

    renderScreen();
    fireEvent.press(screen.getByLabelText("onboarding_screen.skip"));

    expect(finish).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();

    await act(async () => resolveFinish());
    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
  });

  it("invokes the Get Started callback on the final step", async () => {
    useOnboardingFlow.setState({ activeIndex: 2 });

    renderScreen();
    fireEvent(screen.getByTestId("onboarding-pager-viewport"), "layout", {
      nativeEvent: { layout: { width: 400, height: 600 } },
    });
    fireEvent.press(screen.getByLabelText("onboarding_screen.get_started"));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("does not leave onboarding when completion persistence fails", async () => {
    const finish = jest.fn(async () => {
      useOnboardingFlow.setState({
        completion: { status: "failure", error: "disk full" },
      });
    });
    useOnboardingFlow.setState({ finish });

    renderScreen();
    fireEvent.press(screen.getByLabelText("onboarding_screen.skip"));

    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
    expect(onSkip).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
