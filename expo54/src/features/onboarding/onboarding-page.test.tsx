import { render, screen } from "@testing-library/react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { onboardingSteps } from "./onboarding-content";
import { OnboardingPage } from "./onboarding-page";

jest.mock("heroui-native", () => ({
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
  Typography: (props: {
    children: React.ReactNode;
    accessibilityRole?: "header";
  }) =>
    React.createElement(Text, { accessibilityRole: props.accessibilityRole }, props.children),
}));

function GuideVariation() {
  return <View />;
}

const guideStep = onboardingSteps[0];

describe("onboarding content", () => {
  it("defines only serializable onboarding presentation data", () => {
    for (const step of onboardingSteps) {
      expect(typeof step.id).toBe("string");
      expect(typeof step.titleKey).toBe("string");
      expect(["guide", "informational", "reminders"]).toContain(step.presentation);
      expect(Object.values(step)).not.toContain(expect.any(Function));
    }
  });

  it("renders the supplied step without carousel-state props", () => {
    render(<OnboardingPage step={guideStep} variation={<GuideVariation />} />);

    expect(screen.getByRole("header", { name: guideStep.titleKey })).toBeTruthy();
  });

  it("keeps page controls tappable while the body scrolls", () => {
    const view = render(<OnboardingPage step={guideStep} variation={<GuideVariation />} />);

    expect(view.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe(
      "handled"
    );
  });
});
