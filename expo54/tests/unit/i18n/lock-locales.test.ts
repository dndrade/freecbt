import locals from "@/i18n/locals";
import { I18n } from "i18n-js";

const headers = {
  bg: "*пинкод заключване 🔒",
  de: "*pincode lock 🔒",
  en: "*pincode lock 🔒",
  fa: "*قفل رمز 🔒",
  hi: "*पिनकोड लॉक 🔒",
  nb: "*lås med PIN 🔒",
  "pt-PT": "*Bloqueio por código PIN 🔒",
  ru: "*пинкод замок 🔒",
  uk: "*pincode lock 🔒",
} as const;

describe("lock feature locales", () => {
  it.each(Object.entries(headers))(
    "keeps %s PIN copy in the assembled registry",
    (locale, header) => {
      const pincode = (
        locals as unknown as Record<string, { settings: { pincode: unknown } }>
      )[locale].settings.pincode as {
        header: string;
        description: string;
        button: object;
      };
      expect(pincode.header).toBe(header);
      expect(pincode.description).toBeTruthy();
      expect(pincode.button).toEqual(
        expect.objectContaining({
          update: expect.any(String),
          clear: expect.any(String),
          set: expect.any(String),
        }),
      );
    },
  );

  it("keeps English lock-screen copy and falls back to it", () => {
    expect(locals.en.lock_screen).toMatchObject({
      auth: "Please enter your passcode.",
      update: "Please set a passcode.",
      confirm: "Please re-enter your passcode to confirm.",
    });
    const i18n = new I18n(locals);
    i18n.enableFallback = true;
    i18n.locale = "it";
    expect(i18n.t("lock_screen.auth")).toBe("Please enter your passcode.");
  });
});
