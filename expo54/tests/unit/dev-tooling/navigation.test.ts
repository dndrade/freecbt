import { debugNavItems } from "@/src/debug/navigation";

describe("debugNavItems", () => {
  it("exposes only the four top-level debug destinations", () => {
    expect(debugNavItems).toHaveLength(4);
    expect(debugNavItems.map((item) => item.title)).toEqual([
      "UI/UX Lab",
      "Feature Diagnostics",
      "Tools",
      "Logic Demos",
    ]);
  });

  it("routes to the four category subtrees", () => {
    expect(debugNavItems.map((item) => item.href)).toEqual([
      "/v2/debug/lab",
      "/v2/debug/diagnostics",
      "/v2/debug/tools",
      "/v2/debug/demos",
    ]);
  });
});
