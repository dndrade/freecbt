import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { OnboardingGateway } from "@/src/view/gateways/onboarding-gateway";

const mockPush = jest.fn();
const mockInitialize = jest.fn();
let mockPathname = "/v2";
let mockSettingsState: {
  settings: { existingUser: boolean } | null;
  isHydrated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
} = {
  settings: { existingUser: false },
  isHydrated: true,
  isLoading: false,
  initialize: mockInitialize,
};
let mockSettingsThrows = false;

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src", () => ({
  Routes: { introV2: () => "/v2/help/intro" },
}));

jest.mock("@/src/features/settings/hooks/useSettings", () => ({
  useSettings: (selector: (s: typeof mockSettingsState) => unknown) => {
    if (mockSettingsThrows) {
      throw new Error("simulated settings read failure");
    }
    return selector(mockSettingsState);
  },
}));

function Child() {
  return <Text>gateway child</Text>;
}

function gateway() {
  return (
    <OnboardingGateway>
      <Child />
    </OnboardingGateway>
  );
}

describe("OnboardingGateway", () => {
  beforeEach(() => {
    mockPathname = "/v2";
    mockPush.mockClear();
    mockInitialize.mockClear();
    mockSettingsState = {
      settings: { existingUser: false },
      isHydrated: true,
      isLoading: false,
      initialize: mockInitialize,
    };
    mockSettingsThrows = false;
  });

  it("initializes settings once and waits for hydration", () => {
    mockSettingsState = {
      settings: null,
      isHydrated: false,
      isLoading: true,
      initialize: mockInitialize,
    };
    const view = render(gateway());

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("gateway child")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();

    mockSettingsState = {
      settings: { existingUser: true },
      isHydrated: true,
      isLoading: false,
      initialize: mockInitialize,
    };
    view.rerender(gateway());

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to onboarding when the user has not completed it", () => {
    render(gateway());
    expect(mockPush).toHaveBeenCalledWith("/v2/help/intro");
  });

  it("renders children directly for an existing user", () => {
    mockSettingsState = {
      settings: { existingUser: true },
      isHydrated: true,
      isLoading: false,
      initialize: mockInitialize,
    };
    render(gateway());
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders children on the onboarding route itself without redirecting", () => {
    mockPathname = "/v2/help/intro";
    render(gateway());
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("fails open and renders children if the settings read throws during render", () => {
    mockSettingsThrows = true;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
    render(gateway());
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
