import * as Localization from "expo-localization";
import { defaultLocale } from "@/src/i18n/use-i18n";

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(),
}));

function mockLocales(
  ...locales: { languageTag: string; languageCode: string | null }[]
) {
  (Localization.getLocales as jest.Mock).mockReturnValue(locales);
}

describe("defaultLocale", () => {
  it("matches a bare-code locale by language code when the device tag is region-qualified", () => {
    mockLocales({ languageTag: "en-US", languageCode: "en" });

    expect(defaultLocale()).toBe("en");
  });

  it("does not fall through to a lower-preference region-tagged locale", () => {
    // regression: "en-US" used to fail its exact match against the bare "en"
    // key, so the loop fell through to "pt-BR" even though English was the
    // user's top preference.
    mockLocales(
      { languageTag: "en-US", languageCode: "en" },
      { languageTag: "pt-BR", languageCode: "pt" }
    );

    expect(defaultLocale()).toBe("en");
  });

  it("prefers an exact region match over the bare language code", () => {
    mockLocales({ languageTag: "pt-PT", languageCode: "pt" });

    expect(defaultLocale()).toBe("pt-PT");
  });

  it("distinguishes pt-BR from pt-PT", () => {
    mockLocales({ languageTag: "pt-BR", languageCode: "pt" });

    expect(defaultLocale()).toBe("pt-BR");
  });

  it("falls back to english when no preferred locale is supported", () => {
    mockLocales({ languageTag: "xx-YY", languageCode: "xx" });

    expect(defaultLocale()).toBe("en");
  });
});
