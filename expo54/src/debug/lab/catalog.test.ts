import type { Href } from "expo-router";
import { groupLabCatalog, labCatalog, type LabExperiment } from "./catalog";

describe("labCatalog", () => {
  it("keeps every entry pointed at a route under /v2/debug/lab", () => {
    expect(labCatalog.length).toBeGreaterThan(0);

    for (const item of labCatalog) {
      expect(item.href as string).toMatch(/^\/v2\/debug\/lab\//);
    }
  });

  it("includes the current onboarding prototype", () => {
    const onboarding = labCatalog.find((item) => item.id === "onboarding-current");

    expect(onboarding).toMatchObject({
      title: "Current",
      group: "Onboarding",
      href: "/v2/debug/lab/onboarding",
      status: "current",
    });
  });
});

describe("groupLabCatalog", () => {
  const fixture: LabExperiment[] = [
    { id: "a", title: "A", href: "/v2/debug/lab/a" as Href, group: "Alpha" },
    { id: "b", title: "B", href: "/v2/debug/lab/b" as Href, group: "Beta" },
    { id: "c", title: "C", href: "/v2/debug/lab/c" as Href, group: "Alpha" },
  ];

  it("groups experiments by family, preserving first-seen group order", () => {
    const grouped = groupLabCatalog(fixture);

    expect(grouped.map((g) => g.group)).toEqual(["Alpha", "Beta"]);
  });

  it("keeps items within a group in catalog order", () => {
    const grouped = groupLabCatalog(fixture);

    expect(grouped[0].items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(grouped[1].items.map((i) => i.id)).toEqual(["b"]);
  });
});
