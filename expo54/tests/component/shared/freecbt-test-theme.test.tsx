/**
 * @jest-environment jsdom
 */
import { renderWithProviders } from "@/tests/support/render";
import { Checkbox } from "heroui-native";
import React from "react";

// Regression test for the Jest-only theme shim (tests/support/freecbt-test-theme.ts):
// HeroUI's Checkbox resolves its check-icon color via Uniwind's
// useCSSVariable(), which reads from Uniwind's runtime variable store —
// normally populated by Metro/Uniwind's CSS pipeline, which Jest never
// runs. Without the shim this warns "invalid" is not a valid color or
// brush (and, before --theme is seeded, an unresolved-variable warning).
test("HeroUI Checkbox resolves theme colors under the Jest theme shim", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

  renderWithProviders(<Checkbox isSelected onSelectedChange={() => {}} />);

  const warnings = warn.mock.calls.map((call) => String(call[0])).join("\n");
  expect(warnings).not.toMatch(/not a valid color or brush/);
  expect(warnings).not.toMatch(/--theme/);

  warn.mockRestore();
});
