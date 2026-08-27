import React from "react";
import { screen } from "@testing-library/react-native";
import { HomeHandoffScreen } from "@/features/onboarding/screens/HomeHandoffScreen";
import { I18nProvider } from "@/i18n/use-i18n";
import { renderWithProviders } from "@/tests/support/render";

function renderScreen(finalThought?: string) {
  return renderWithProviders(
    <I18nProvider locale="en">
      <HomeHandoffScreen finalThought={finalThought} />
    </I18nProvider>,
  );
}

test("shows the captured thought and the 'open journal' CTA when one exists", () => {
  renderScreen("I can begin small");
  expect(screen.getByText("I can begin small")).toBeTruthy();
  expect(screen.getByText("Open my journal")).toBeTruthy();
});

test("shows an honest empty state and the 'start' CTA when nothing was captured", () => {
  renderScreen();
  expect(
    screen.getByText(
      "No thought recorded yet — you can start one any time from here.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Start my first thought")).toBeTruthy();
});
