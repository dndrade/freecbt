import { createRoutesManifest } from "expo-router/build/routes-manifest";

describe("debug lab route namespace", () => {
  it("keeps the settings family and current routes under /v2/debug/lab", () => {
    const manifest = createRoutesManifest(
      [
        "./debug/_layout.tsx",
        "./debug/index.tsx",
        "./debug/lab/_layout.tsx",
        "./debug/lab/index.tsx",
        "./debug/lab/settings/_layout.tsx",
        "./debug/lab/settings/index.tsx",
        "./debug/lab/settings/secure-backups-v2/index.tsx",
        "./debug/lab/settings/secure-backups-v2/current.tsx",
        "./debug/lab/settings/export/index.tsx",
        "./debug/lab/settings/export/current.tsx",
      ],
      { internal_stripLoadRoute: true },
    );

    expect(manifest).not.toBeNull();

    const routes = manifest!.htmlRoutes
      .map(({ page }) => page.replace(/\/index$/, ""))
      .map((page) => (page === "/debug" ? "/v2/debug" : `/v2${page}`));

    expect(routes).toEqual(
      expect.arrayContaining([
        "/v2/debug",
        "/v2/debug/lab",
        "/v2/debug/lab/settings",
        "/v2/debug/lab/settings/secure-backups-v2",
        "/v2/debug/lab/settings/secure-backups-v2/current",
        "/v2/debug/lab/settings/export",
        "/v2/debug/lab/settings/export/current",
      ]),
    );
    expect(routes.some((route) => route.includes("reminders"))).toBe(false);
  });
});
