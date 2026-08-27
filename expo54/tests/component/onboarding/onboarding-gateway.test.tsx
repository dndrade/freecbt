import React from "react";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useOnboardingFlow } from "@/features/onboarding/store/useOnboardingFlow";
import { OnboardingGateway } from "@/src/view/gateways/onboarding-gateway";

const mockPush = jest.fn();
let mockPathname = "/v2";
let mockSettingsState: {
  settings: { existingUser: boolean };
} = {
  settings: { existingUser: false },
};
let mockSettingsThrows = false;
const mockCompleteOnboarding = jest.fn(() => {
  mockSettingsState = { settings: { existingUser: true } };
});

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src", () => ({
  Routes: { introV2: () => "/v2/help/intro" },
}));

jest.mock("@/src/features/settings/hooks/useSettings", () => ({
  useSettings: Object.assign(
    (selector: (s: typeof mockSettingsState) => unknown) => {
      if (mockSettingsThrows) {
        throw new Error("simulated settings read failure");
      }
      return selector(mockSettingsState);
    },
    { getState: () => ({ completeOnboarding: mockCompleteOnboarding }) },
  ),
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
    mockSettingsState = {
      settings: { existingUser: false },
    };
    mockSettingsThrows = false;
    mockCompleteOnboarding.mockClear();
    useOnboardingFlow.setState({
      currentStepId: "welcome",
      history: [],
      guidedPersonalThought: "",
      composerThought: "",
      isSaving: false,
      error: null,
    });
  });

  it("redirects to onboarding when the user has not completed it", () => {
    render(gateway());
    expect(mockPush).toHaveBeenCalledWith("/v2/help/intro");
  });

  it("renders children directly for an existing user", () => {
    mockSettingsState = {
      settings: { existingUser: true },
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

  it("keeps the app path open after empty Skip completes onboarding", async () => {
    mockPathname = "/v2/help/intro";
    const view = render(gateway());

    await act(async () => {
      await expect(
        useOnboardingFlow.getState().finishOnboarding(),
      ).resolves.toEqual({ status: "empty" });
    });
    mockPathname = "/v2";
    view.rerender(gateway());

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("fails open and renders children if the settings read throws during render", () => {
    mockSettingsThrows = true;
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    render(gateway());
    expect(screen.getByText("gateway child")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
