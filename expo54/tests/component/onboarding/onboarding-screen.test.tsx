import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import {
  Text,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { OnboardingScreen } from "@/features/onboarding/screens/OnboardingScreen";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";

const onSkip = jest.fn();
const onComplete = jest.fn();
let headerRightElement: React.ReactNode;

function renderScreen() {
  return render(<OnboardingScreen onSkip={onSkip} onComplete={onComplete} />);
}

function settleTerminalSave(status: "saved" | "failed") {
  return jest.fn(async () => {
    if (useOnboardingFlow.getState().isSaving)
      return { status: "failed" as const };
    useOnboardingFlow.setState({ isSaving: true, error: null });
    await Promise.resolve();
    if (status === "saved") {
      useOnboardingFlow.setState({
        currentStepId: "welcome",
        history: [],
        isSaving: false,
        error: null,
      });
      return { status: "saved" as const, thought: {} as never };
    }
    useOnboardingFlow.setState({
      isSaving: false,
      error: new Error("disk full"),
    });
    return { status: "failed" as const };
  });
}

jest.mock("@/shared/components", () => ({
  Section: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
  StandardScreen: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, headerRightElement, props.children),
  backHeaderAction: (onPress: () => void) => ({ onPress }),
  useScreenHeader: (options: { rightElement?: React.ReactNode }) => {
    headerRightElement = options.rightElement;
  },
  Button: (props: {
    title?: string;
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        accessibilityRole: "button",
        accessibilityState: { disabled: props.disabled },
        disabled: props.disabled,
        onPress: props.onPress,
        testID: props.testID,
      },
      React.createElement(Text, null, props.title ?? props.children),
    ),
  TextInput: (props: React.ComponentProps<typeof NativeTextInput>) =>
    React.createElement(NativeTextInput, props),
  Card: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
  SelectableCard: (props: { title: string; onPress: () => void }) =>
    React.createElement(
      TouchableOpacity,
      { accessibilityRole: "button", onPress: props.onPress },
      React.createElement(Text, null, props.title),
    ),
  ChipRow: () => null,
  ErrorBoundary: (props: { children: React.ReactNode }) => props.children,
  FlowProgress: () => null,
  FlowAction: (props: { onPress: () => void }) =>
    React.createElement(TouchableOpacity, { onPress: props.onPress }),
}));

jest.mock("heroui-native", () => ({
  Typography: (props: { children: React.ReactNode }) =>
    React.createElement(Text, null, props.children),
  useThemeColor: () => "#fff",
  Button: (props: { children: React.ReactNode; onPress?: () => void }) =>
    React.createElement(
      TouchableOpacity,
      { onPress: props.onPress },
      props.children,
    ),
}));

jest.mock("react-native-gesture-handler", () => {
  const pan = () => {
    const gesture: {
      enabled: () => typeof gesture;
      onEnd: (
        handler: (event: { translationX: number }) => void,
      ) => typeof gesture;
      end?: (event: { translationX: number }) => void;
    } = {
      enabled: () => gesture,
      onEnd: (handler: (event: { translationX: number }) => void) => {
        gesture.end = handler;
        return gesture;
      },
    };
    return gesture;
  };
  return {
    Gesture: { Pan: pan },
    GestureDetector: (props: {
      children: React.ReactNode;
      gesture: { end?: (event: { translationX: number }) => void };
    }) =>
      React.createElement(
        View,
        {
          testID: "onboarding-swipe-area",
          onTouchEnd: (event) =>
            props.gesture.end?.(
              event.nativeEvent as unknown as { translationX: number },
            ),
        },
        props.children,
      ),
  };
});

jest.mock("react-native-reanimated", () => {
  const animation = {
    duration: () => animation,
    reduceMotion: () => animation,
  };
  return {
    __esModule: true,
    default: { View },
    FadeIn: animation,
    SlideInLeft: animation,
    SlideInRight: animation,
    SlideOutLeft: animation,
    SlideOutRight: animation,
    ReduceMotion: { System: "system" },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (callback: () => object) => callback(),
    withTiming: (value: unknown) => value,
  };
});

jest.mock("@/i18n/use-i18n", () => ({
  ...jest.requireActual("@/i18n/use-i18n"),
  useI18n: () => ({ t: (key: string) => key }),
}));
jest.mock("@/features/reminders/use-reminders", () => ({
  useReminders: () => ({
    isSupported: () => false,
    enableReminders: jest.fn(),
    disableReminders: jest.fn(),
  }),
}));
jest.mock("@/src/assets/image-path", () => ({ notifications: 1 }));
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
}));
jest.mock("react-native-reanimated-carousel", () => () => null);

describe("OnboardingScreen", () => {
  const defaults = useOnboardingFlow.getState();

  beforeEach(() => {
    useOnboardingFlow.setState({
      currentStepId: "welcome",
      history: [],
      situation: "interview",
      revealed: false,
      selectedDistortionSlugs: [],
      selectedEvidenceIds: [],
      guidedAlternative: "",
      guidedPersonalThought: "",
      composerThought: "",
      isSaving: false,
      error: null,
      finishOnboarding: defaults.finishOnboarding,
    });
    onSkip.mockReset();
    onComplete.mockReset();
    headerRightElement = null;
  });

  it("renders only the step selected by currentStepId", () => {
    renderScreen();

    expect(screen.getByText("onboarding_screen.welcome.title")).toBeTruthy();
    expect(screen.queryByText("onboarding_screen.privacy.title")).toBeNull();
  });

  it("skips only after a saved or empty finish result", async () => {
    const finishOnboarding = jest.fn().mockResolvedValue({ status: "saved" });
    useOnboardingFlow.setState({ finishOnboarding });
    renderScreen();

    fireEvent.press(screen.getByLabelText("onboarding_screen.skip"));

    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
  });

  it("does not leave onboarding when Skip cannot save", async () => {
    useOnboardingFlow.setState({
      finishOnboarding: jest.fn().mockResolvedValue({ status: "failed" }),
    });
    renderScreen();

    fireEvent.press(screen.getByLabelText("onboarding_screen.skip"));

    await waitFor(() => expect(onSkip).not.toHaveBeenCalled());
  });

  it("keeps terminal-step Skip on its separate callback", async () => {
    useOnboardingFlow.setState({
      currentStepId: "composer",
      composerThought: "A meaningful thought",
      finishOnboarding: settleTerminalSave("saved"),
    });
    renderScreen();

    fireEvent.press(screen.getByLabelText("onboarding_screen.skip"));

    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does not advance when invitation is swiped", () => {
    useOnboardingFlow.setState({
      currentStepId: "invitation",
      history: ["path"],
    });
    renderScreen();

    fireEvent(screen.getByTestId("onboarding-swipe-area"), "touchEnd", {
      nativeEvent: { translationX: -50 },
    });

    expect(useOnboardingFlow.getState().currentStepId).toBe("invitation");
  });

  it("reveals the guided thought before a second forward swipe advances", () => {
    useOnboardingFlow.setState({
      currentStepId: "g-thought",
      history: ["g-situation"],
    });
    renderScreen();

    fireEvent(screen.getByTestId("onboarding-swipe-area"), "touchEnd", {
      nativeEvent: { translationX: -50 },
    });
    expect(useOnboardingFlow.getState().revealed).toBe(true);
    expect(useOnboardingFlow.getState().currentStepId).toBe("g-thought");

    fireEvent(screen.getByTestId("onboarding-swipe-area"), "touchEnd", {
      nativeEvent: { translationX: -50 },
    });
    expect(useOnboardingFlow.getState().currentStepId).toBe("g-pattern");
  });

  it.each([
    ["g-pattern", { selectedDistortionSlugs: [] as string[] }],
    ["g-evidence", { selectedEvidenceIds: [] as string[] }],
    ["g-alternative", { guidedAlternative: "   " }],
    ["composer", { composerThought: "   " }],
    ["g-your-turn", { guidedPersonalThought: "   " }],
  ] as const)(
    "does not forward-swipe past an unready %s step",
    (currentStepId, readiness) => {
      useOnboardingFlow.setState({
        currentStepId,
        history: ["invitation"],
        ...readiness,
      });
      renderScreen();

      fireEvent(screen.getByTestId("onboarding-swipe-area"), "touchEnd", {
        nativeEvent: { translationX: -50 },
      });

      expect(useOnboardingFlow.getState().currentStepId).toBe(currentStepId);
    },
  );

  it("swipes back through recorded history", () => {
    useOnboardingFlow.setState({
      currentStepId: "g-evidence",
      history: ["g-situation", "g-thought", "g-pattern"],
    });
    renderScreen();

    fireEvent(screen.getByTestId("onboarding-swipe-area"), "touchEnd", {
      nativeEvent: { translationX: 50 },
    });

    expect(useOnboardingFlow.getState()).toMatchObject({
      currentStepId: "g-pattern",
      history: ["g-situation", "g-thought"],
    });
  });

  it.each([
    ["composer", "composerThought", "onboarding_screen.composer.cta"],
    [
      "g-your-turn",
      "guidedPersonalThought",
      "onboarding_screen.guided.your_turn_cta",
    ],
  ] as const)(
    "completes once after %s saves",
    async (currentStepId, thoughtKey, cta) => {
      const finishOnboarding = settleTerminalSave("saved");
      useOnboardingFlow.setState({
        currentStepId,
        [thoughtKey]: "A meaningful thought",
        finishOnboarding,
      });
      renderScreen();

      fireEvent.press(screen.getByText(cta));
      fireEvent.press(screen.getByText(cta));

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(finishOnboarding).toHaveBeenCalledTimes(2);
    },
  );

  it("stays on a terminal step when saving fails", async () => {
    const finishOnboarding = settleTerminalSave("failed");
    useOnboardingFlow.setState({
      currentStepId: "composer",
      composerThought: "A meaningful thought",
      finishOnboarding,
    });
    renderScreen();

    fireEvent.press(screen.getByText("onboarding_screen.composer.cta"));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledTimes(1));
    expect(useOnboardingFlow.getState().currentStepId).toBe("composer");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
