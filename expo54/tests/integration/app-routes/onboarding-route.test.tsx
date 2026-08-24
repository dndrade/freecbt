import Intro from "@/app/v2/(public)/help/intro";
import { OnboardingScreen } from "@/features/onboarding";
import { Routes } from "@/src";
import { render } from "@testing-library/react-native";
import React from "react";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("@/features/onboarding", () => ({
  OnboardingScreen: jest.fn(() => null),
}));

test.each(["onSkip", "onComplete"] as const)(
  "passes a Home handoff to %s",
  (callbackName) => {
    jest.mocked(OnboardingScreen).mockClear();
    mockReplace.mockClear();
    render(<Intro />);

    const props = jest.mocked(OnboardingScreen).mock.calls[0][0];
    props[callbackName]();

    expect(mockReplace).toHaveBeenCalledWith(Routes.homeV2());
  },
);
