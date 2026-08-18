import {
  getLabFamily,
  getLabScenario,
  getLabVariant,
  labFamilies,
} from "@/src/debug/lab/catalog";

describe("labFamilies", () => {
  it("exposes onboarding and settings families in order", () => {
    expect(labFamilies.map((family) => family.title)).toEqual([
      "Onboarding",
      "Settings",
    ]);
  });

  it("keeps settings split into the four required scenarios", () => {
    const settings = getLabFamily("settings");

    expect(settings.scenarios?.map((scenario) => scenario.title)).toEqual([
      "Main Settings",
      "PIN Setup",
      "Backup Setup",
      "Export",
    ]);
    expect(settings.scenarios).toHaveLength(4);
    expect(settings.scenarios?.some((scenario) => scenario.title === "Reminders")).toBe(false);
  });

  it("gives every settings scenario a current variant and a typed route", () => {
    const settings = getLabFamily("settings");

    for (const scenario of settings.scenarios ?? []) {
      expect(scenario.variants.map((variant) => variant.title)).toEqual(["Current"]);
      expect(scenario.variants[0]?.href as string).toMatch(/^\/v2\/debug\/lab\//);
    }
  });

  it("keeps onboarding on the existing lab route", () => {
    expect(getLabFamily("onboarding").href).toBe("/v2/debug/lab/onboarding");
  });

  it("looks up scenario and variant entries by id", () => {
    expect(getLabScenario("settings", "backup-setup").title).toBe("Backup Setup");
    expect(getLabVariant("settings", "backup-setup", "backup-setup-current").title).toBe("Current");
  });
});
