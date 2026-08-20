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
      "Thoughts",
      "Settings",
    ]);
  });

  it("keeps settings split into the five required scenarios", () => {
    const settings = getLabFamily("settings");

    expect(settings.scenarios?.map((scenario) => scenario.title)).toEqual([
      "Main Settings",
      "PIN Setup",
      "Backup Setup",
      "Secure Backups (v2)",
      "Export",
    ]);
    expect(settings.scenarios).toHaveLength(5);
    expect(settings.scenarios?.some((scenario) => scenario.title === "Reminders")).toBe(false);
  });

  it("gives every settings scenario a variant and a typed route", () => {
    const settings = getLabFamily("settings");

    for (const scenario of settings.scenarios ?? []) {
      expect(scenario.variants.length).toBeGreaterThan(0);
      expect(scenario.variants[0]?.href as string).toMatch(/^\/v2\/debug\/lab\//);
    }
  });

  it("marks every scenario except the new proposed one as Current", () => {
    const settings = getLabFamily("settings");
    const nonProposed = settings.scenarios?.filter((s) => s.id !== "secure-backups-v2") ?? [];

    for (const scenario of nonProposed) {
      expect(scenario.variants.map((variant) => variant.title)).toEqual(["Current"]);
    }
  });

  it("marks the secure-backups-v2 scenario's variant as Proposed and experimental", () => {
    const variant = getLabVariant("settings", "secure-backups-v2", "secure-backups-v2-current");
    expect(variant.title).toBe("Proposed");
    expect(variant.status).toBe("experimental");
  });

  it("keeps onboarding on the existing lab route", () => {
    expect(getLabFamily("onboarding").href).toBe("/v2/debug/lab/onboarding");
  });

  it("looks up scenario and variant entries by id", () => {
    expect(getLabScenario("settings", "backup-setup").title).toBe("Backup Setup");
    expect(getLabVariant("settings", "backup-setup", "backup-setup-current").title).toBe("Current");
  });
});
