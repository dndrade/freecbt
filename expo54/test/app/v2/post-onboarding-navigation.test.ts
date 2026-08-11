import fs from "node:fs";
import path from "node:path";
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { OnboardingGateway } from "@/src/view/gateways/onboarding-gateway";
import { Ready } from "@/src/app/v2/(public)/help/intro";

const mockPush = jest.fn();
const mockDispatch = jest.fn();
const mockReminders = {
  isSupported: () => true,
  enable: jest.fn(),
  disable: jest.fn(),
};
let mockPathname = "/v2";
let mockExistingUser = false;
let mockWindowHeight = 800;

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
  ImagePath: {
    looker: 1,
    eater: 2,
    logo: 3,
    notifications: 4,
  },
  Screen: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  Section: (props: { children: React.ReactNode }) => React.createElement(View, null, props.children),
  SegmentedProgress: () => React.createElement(View),
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
  useSharedValue: () => ({ value: 0 }),
  createAnimatedComponent: (component: unknown) => component,
}));

jest.mock("react-native-reanimated-carousel", () => {
  function Carousel(props: {
    data: readonly string[];
    renderItem: (props: { item: string; index: number }) => React.ReactNode;
  }) {
    const item = props.data[props.data.length - 1];
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
  return React.createElement(Ready, {
    model: { onboardingCompletion: completion } as never,
    dispatch: mockDispatch,
    style: mockStyle as never,
    translate: ((key: string) => key) as never,
  });
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
    mockWindowHeight = 800;
    jest.clearAllMocks();
  });

  it("keeps the approved completion target at /v2", () => {
    const routes = fs.readFileSync(
      path.join(__dirname, "../../../src/routes.ts"),
      "utf8"
    );

    expect(routes).toMatch(
      /export function homeV2\(\): Href\s*\{\s*return "\/v2";/
    );
  });

  it("uses the intro pathname as active onboarding state", () => {
    const gateway = fs.readFileSync(
      path.join(__dirname, "../../../src/view/gateways/onboarding-gateway.tsx"),
      "utf8"
    );

    expect(gateway).toMatch(/usePathname/);
    expect(gateway).toMatch(/pathname === "\/v2\/help\/intro"/);
    expect(gateway).toMatch(/useRef\(false\)/);
    expect(gateway).not.toMatch(/useGlobalSearchParams/);
    expect(gateway).not.toMatch(/dispatch\(Action\.setExistingUser\(\)\)/);
  });

  it("routes to onboarding without a completion query marker", () => {
    const routes = fs.readFileSync(
      path.join(__dirname, "../../../src/routes.ts"),
      "utf8"
    );

    expect(routes).toMatch(
      /export function introV2\(\): Href\s*\{\s*return "\/v2\/help\/intro";/
    );
    expect(routes).not.toMatch(/onboarded/);
  });

  it("uses one explicit completion action for every onboarding exit", () => {
    const intro = fs.readFileSync(
      path.join(__dirname, "../../../src/app/v2/(public)/help/intro.tsx"),
      "utf8"
    );

    expect(intro).not.toMatch(/thoughtCreateV2/);
    expect(intro.match(/Action\.beginOnboardingCompletion\(\)/g)).toHaveLength(1);
    expect(intro).toMatch(/Routes\.homeV2\(\)/);
    expect(intro).toMatch(/onPressGetStarted/);
    expect(intro.match(/renderGetStarted\(\)/g)).toHaveLength(3);
    expect(intro).toMatch(/Saving…/);
    expect(intro).toMatch(/Unable to save\. Try again\./);
    expect(intro).toMatch(/isDisabled=\{isSaving\}/);
  });

  it("keeps unsupported Change as the final content step", () => {
    const intro = fs.readFileSync(
      path.join(__dirname, "../../../src/app/v2/(public)/help/intro.tsx"),
      "utf8"
    );

    expect(intro).toMatch(/reminders\.isSupported\(\) \? null : renderGetStarted\(\)/);
    expect(intro).toMatch(/case "reminders"[\s\S]*?renderGetStarted\(\)/);
  });

  it("keeps reminder choices persistence-only before completion", () => {
    const view = render(intro("idle"));

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
    const view = render(intro("idle"));

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

  it("renders children for a completed user", () => {
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
