import { renderHook } from "@testing-library/react-native";
import React from "react";
import { I18nProvider, useTranslate } from "./use-i18n";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider locale="en">{children}</I18nProvider>
);

describe("useTranslate", () => {
  it("interpolates arguments while preserving one-argument translations", () => {
    const { result } = renderHook(() => useTranslate() as any, { wrapper });

    expect(result.current("settings.about.version", { version: "2.5.0-rc.1" })).toBe(
      "Version 2.5.0-rc.1"
    );
    expect(result.current("settings.about.header")).toBe("About");
  });
});
