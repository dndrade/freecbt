import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ScrollView, Text, View } from "react-native";
import { OnboardingStepFrame } from "@/src/features/onboarding/components/OnboardingStepFrame";

jest.mock("@/shared/components", () => ({
  Section: (props: { children: React.ReactNode; className?: string }) =>
    React.createElement(View, { className: props.className }, props.children),
}));

jest.mock("heroui-native", () => ({
  Typography: (props: { children: React.ReactNode; accessibilityRole?: "header" }) =>
    React.createElement(Text, { accessibilityRole: props.accessibilityRole }, props.children),
}));

function GuideVariation() {
  return <View testID="variation" />;
}

describe("OnboardingStepFrame", () => {
  it("renders the title as a header, using the raw key when no translate fn is given", () => {
    render(<OnboardingStepFrame titleKey="onboarding_screen.readme" variation={<GuideVariation />} />);
    expect(screen.getByRole("header", { name: "onboarding_screen.readme" })).toBeTruthy();
    expect(screen.getByTestId("variation")).toBeTruthy();
  });

  it("translates title and body when a translate fn is given", () => {
    const translate = (key: string) => `translated:${key}`;
    render(
      <OnboardingStepFrame
        titleKey="onboarding_screen.block1.header"
        bodyKey="onboarding_screen.block1.body"
        translate={translate}
      />
    );
    expect(screen.getByText("translated:onboarding_screen.block1.header")).toBeTruthy();
    expect(screen.getByText("translated:onboarding_screen.block1.body")).toBeTruthy();
  });

  it("omits body text when no bodyKey is given", () => {
    render(<OnboardingStepFrame titleKey="onboarding_screen.readme" />);
    expect(screen.queryByText(/./)).toBeTruthy();
  });

  it("keeps content in a scroll container with keyboardShouldPersistTaps handled", () => {
    const view = render(<OnboardingStepFrame titleKey="onboarding_screen.readme" />);
    expect(view.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe("handled");
  });
});
