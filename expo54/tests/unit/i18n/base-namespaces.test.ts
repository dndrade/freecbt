import locals from "@/i18n/locals";
import { I18n } from "i18n-js";

describe("base i18n namespaces", () => {
  it("exposes English common, errors, and validation copy", () => {
    expect(locals.en.common).toEqual({
      actions: {
        exit: "Exit",
        continue: "Continue",
        cancel: "Cancel",
        close: "Close",
        retry: "Retry",
      },
      choices: { on: "On", off: "Off", yes: "Yes", no: "No" },
      status: { loading: "Loading…", done: "Done" },
    });
    expect(locals.en.errors).toEqual({
      network_unavailable: "Network is unavailable.",
      storage_unavailable: "Storage is unavailable.",
      unknown: "An unknown error occurred.",
    });
    expect(locals.en.validation.pin_exactly_four_digits).toBe(
      "PIN must be exactly 4 digits.",
    );
  });

  it("falls back to English base copy for locales without namespaces", () => {
    const i18n = new I18n(locals);
    i18n.enableFallback = true;
    i18n.locale = "it";

    expect(i18n.t("common.actions.continue")).toBe("Continue");
  });
});
