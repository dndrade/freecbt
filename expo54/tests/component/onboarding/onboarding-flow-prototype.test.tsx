import React from "react";
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { View } from "react-native";
import {
  completionIdle,
  slidesWithReminders,
  slidesWithoutReminders,
} from "@/src/debug/ui-lab/onboarding/fixtures";
import { OnboardingFlowPrototype, useOnboardingFlow } from "@/src/debug/ui-lab/onboarding/onboarding-flow";

jest.mock("@/src/components", () => ({
  Screen: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
  Section: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
  SegmentedProgress: ({
    currentIndex,
    count,
    accessibilityLabel,
  }: {
    currentIndex: number;
    count: number;
    accessibilityLabel?: string;
  }) =>
    React.createElement(
      View,
      { accessibilityRole: "progressbar", accessibilityLabel },
      `Step ${currentIndex + 1} of ${count}`
    ),
}));

jest.mock("@/src/hooks/use-style", () => ({
  useDefaultStyle: () => ({
    text: {},
    subheader: {},
    my2: {},
    mt2: {},
    mx1: {},
    flexRow: {},
    flex1: {},
  }),
}));

jest.mock("@/src/i18n/use-i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

describe("onboarding flow lab", () => {
  it("builds the correct slide sets from the fixture toggle", () => {
    const withReminders = renderHookState(true);
    const withoutReminders = renderHookState(false);

    expect(withReminders.slides).toEqual(slidesWithReminders);
    expect(withoutReminders.slides).toEqual(slidesWithoutReminders);
    expect(withReminders.completion).toBe(completionIdle);
    expect(withoutReminders.completion).toBe(completionIdle);
  });

  it("shows saving, then settles to idle or failure", async () => {
    render(
      <OnboardingFlowPrototype remindersSupported />
    );

    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "Get started" }));

    expect(screen.getByText("Completion: saving")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Completion: idle")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Reset flow" }));
    fireEvent.press(screen.getByRole("button", { name: "Simulate save failure" }));
    fireEvent.press(screen.getByRole("button", { name: "Get started" }));

    expect(screen.getByText("Completion: saving")).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByText("Completion: failure")).toBeTruthy()
    );
    expect(screen.getByText("Unable to save. Try again.")).toBeTruthy();
  });

  it("lets the reminder choice be changed on the final slide", () => {
    render(<OnboardingFlowPrototype remindersSupported />);

    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    fireEvent.press(screen.getByRole("button", { name: "onboarding_screen.reminders.button.yes" }));

    expect(screen.getByText("Reminder choice: enabled")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "onboarding_screen.reminders.button.no" }));
    expect(screen.getByText("Reminder choice: disabled")).toBeTruthy();
  });
});

function renderHookState(remindersSupported: boolean) {
  const { result } = renderHook(() => useOnboardingFlow(remindersSupported), {
    wrapper,
  });
  return result.current[0];
}
