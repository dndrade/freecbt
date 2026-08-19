import { readSrcFile } from "@/tests/support/route-manifest";
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { OnboardingGateway } from "@/src/view/gateways/onboarding-gateway";
import { OnboardingScreen } from "@/src/features/onboarding/onboarding-screen";

const mockPush = jest.fn();
const mockDispatch = jest.fn();
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
  isSupported: () => true,
  enable: jest.fn(),
  disable: jest.fn(),
};
let mockPathname = "/v2";
let mockExistingUser = false;

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src/hooks/use-model", () => ({
  LoadModel: (props: { ready: (loaded: unknown) => React.ReactNode }) =>
    props.ready({
      model: { settings: { existingUser: mockExistingUser } },
      dispatch: mockDispatch,
    }),
}));

jest.mock("@/src", () => ({
  Routes: { homeV2: () => "/v2", introV2: () => "/v2/help/intro" },
}));

jest.mock("@/src/components", () => ({
  Section: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  Screen: (props: { children: React.ReactNode; footer?: React.ReactNode }) =>
    React.createElement(
      View,
      null,
      React.createElement(View, null, props.children),
      props.footer ? React.createElement(View, null, props.footer) : null
    ),
  FlowProgress: () => React.createElement(View),
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
      props.state === "final" ? props.finalLabel : "Next"
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
  useSharedValue: () => ({ value: 0 }),
  createAnimatedComponent: (component: unknown) => component,
}));

jest.mock("react-native-reanimated-carousel", () => {
  function Carousel(props: {
    data: readonly string[];
    renderItem: (props: { item: string; index: number }) => React.ReactNode;
    onSnapToItem?: (index: number) => void;
  }) {
    const item = props.data[props.data.length - 1];
    React.useEffect(() => {
      props.onSnapToItem?.(props.data.length - 1);
    }, [props]);
    return React.createElement(
      View,
      null,
      props.renderItem({ item, index: props.data.length - 1 })
    );
  }
  const Pagination = { Basic: () => null };
  return { __esModule: true, default: Carousel, Pagination };
});

const mockStyle: Record<string, object> = new Proxy(
  { container: {}, errorText: {}, button: {}, buttonText: {} } as Record<
    string,
    object
  >,
  { get: (target, key: string) => target[key] ?? {} }
);

function intro(completion: "idle" | "saving" | { status: "failure"; error: Error }) {
  return React.createElement(OnboardingScreen, {
    model: { onboardingCompletion: completion } as never,
    dispatch: mockDispatch,
    style: mockStyle as never,
    translate: mockTranslate as never,
    onSkip: mockOnSkip,
  } as never);
}

function renderIntro(
  completion: "idle" | "saving" | { status: "failure"; error: Error }
) {
  const view = render(intro(completion));
  fireEvent(view.getByTestId("onboarding-pager-viewport"), "layout", {
    nativeEvent: { layout: { width: 400, height: 600 } },
  });
  return view;
}

function Child() {
  return React.createElement(Text, null, "onboarding gateway child");
}

function gateway() {
  return React.createElement(
    OnboardingGateway,
    null,
    React.createElement(Child)
  );
}

describe("post-onboarding navigation", () => {
  beforeEach(() => {
    mockPathname = "/v2";
    mockExistingUser = false;
    jest.clearAllMocks();
  });

  it("keeps the approved completion target at /v2", () => {
    const routes = readSrcFile("routes.ts");

    expect(routes).toMatch(
      /export function homeV2\(\): Href\s*\{\s*return "\/v2";/
    );
  });

  it("uses the intro pathname as active onboarding state", () => {
    const gateway = readSrcFile("view/gateways/onboarding-gateway.tsx");

    expect(gateway).toMatch(/usePathname/);
    expect(gateway).toMatch(/pathname === "\/v2\/help\/intro"/);
    expect(gateway).toMatch(/useRef\(false\)/);
    expect(gateway).not.toMatch(/useGlobalSearchParams/);
    expect(gateway).not.toMatch(/dispatch\(Action\.setExistingUser\(\)\)/);
  });

  it("routes to onboarding without a completion query marker", () => {
    const routes = readSrcFile("routes.ts");

    expect(routes).toMatch(
      /export function introV2\(\): Href\s*\{\s*return "\/v2\/help\/intro";/
    );
    expect(routes).not.toMatch(/onboarded/);
  });

  it("keeps reminder choices persistence-only before completion", () => {
    const view = renderIntro("idle");

    fireEvent.press(view.getByRole("button", { name: "onboarding_screen.reminders.button.yes" }));
    expect(mockReminders.enable).toHaveBeenCalledWith(mockDispatch, expect.any(Function));
    expect(mockDispatch).not.toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(view.getByRole("button", { name: "onboarding_screen.reminders.button.no" }));
    expect(mockReminders.disable).toHaveBeenCalledWith(mockDispatch);
    expect(mockDispatch).not.toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("completes only after saving succeeds and keeps failure retryable", () => {
    const view = renderIntro("idle");

    fireEvent.press(view.getByRole("button", { name: "Get started" }));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      action: "begin-onboarding-completion",
    });
    expect(mockPush).not.toHaveBeenCalled();

    view.rerender(intro("saving"));
    const savingButton = view.getByRole("button", { name: "Saving…" }) as {
      props: { accessibilityState?: { disabled?: boolean } };
    };
    expect(savingButton).toBeTruthy();
    expect(savingButton.props.accessibilityState?.disabled).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();

    view.rerender(intro({ status: "failure", error: new Error("failed") }));
    expect(view.getByText("Unable to save. Try again.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Get started" })).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Get started" }));
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalled();

    view.rerender(intro("idle"));
    act(() => undefined);
    expect(mockPush).toHaveBeenCalledWith("/v2");
  });

  it("pushes onboarding once across rerenders without completing the user", () => {
    const view = render(gateway());

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();

    view.rerender(gateway());

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("renders children on the active onboarding route", () => {
    mockPathname = "/v2/help/intro";

    const view = render(gateway());

    expect(view.getByText("onboarding gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("renders Home children for an existing-user model without redirect", () => {
    mockPathname = "/v2";
    mockExistingUser = true;

    const view = render(gateway());

    expect(view.getByText("onboarding gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("allows a later non-onboarding route to re-enter after abandonment", () => {
    const view = render(gateway());
    expect(mockPush).toHaveBeenCalledTimes(1);

    mockPathname = "/v2/help/intro";
    view.rerender(gateway());
    expect(view.getByText("onboarding gateway child")).toBeTruthy();

    mockPathname = "/v2";
    view.rerender(gateway());

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
