import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { OnboardingGateway } from "@/src/view/gateways/onboarding-gateway";

const mockPush = jest.fn();
const mockDispatch = jest.fn();
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
