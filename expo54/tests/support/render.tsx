import { render, type RenderOptions } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";

/** Wraps RNTL's render with the HeroUINativeProvider most component tests need. */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(
    <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
      {ui}
    </HeroUINativeProvider>,
    options
  );
}
