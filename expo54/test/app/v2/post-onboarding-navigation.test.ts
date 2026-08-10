import fs from "node:fs";
import path from "node:path";

describe("post-onboarding navigation", () => {
  it("keeps the approved completion target at /v2", () => {
    const routes = fs.readFileSync(
      path.join(__dirname, "../../../src/routes.ts"),
      "utf8"
    );

    expect(routes).toMatch(
      /export function homeV2\(\): Href\s*\{\s*return "\/v2";/
    );
  });
});
