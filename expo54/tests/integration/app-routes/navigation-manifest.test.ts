import { createRoutesManifest } from "expo-router/build/routes-manifest";
import { readSrcFile } from "@/tests/support/route-manifest";

describe("production route namespace", () => {
  it("keeps tab and full-screen routes under the right route groups", () => {
    const manifest = createRoutesManifest(
      [
        "./(public)/(tabs)/_layout.tsx",
        "./(public)/(tabs)/index.tsx",
        "./(public)/(tabs)/thoughts/_layout.tsx",
        "./(public)/(tabs)/thoughts/index.tsx",
        "./(public)/(tabs)/thoughts/[idOrKey]/index.tsx",
        "./(public)/(tabs)/settings/index.tsx",
        "./(public)/_layout.tsx",
        "./(public)/thoughts/create.tsx",
        "./(public)/thoughts/[idOrKey]/edit.tsx",
        "./(public)/settings/_layout.tsx",
        "./(public)/settings/lock.tsx",
        "./(public)/settings/data/backup/index.tsx",
        "./(public)/settings/export.tsx",
      ],
      { internal_stripLoadRoute: true }
    );

    expect(manifest).not.toBeNull();
    const routeEntries = manifest?.htmlRoutes.map(({ file, page }) => ({ file, page })) ?? [];
    const routes = routeEntries
      .map(({ page }) => {
        const route = page
          .replaceAll("/(public)", "")
          .replaceAll("/(tabs)", "")
          .replace("[idOrKey]", ":id")
          .replace(/\/index$/, "");
        return route === "/" ? "/v2" : `/v2${route}`;
      });
    const tabRoutes = routeEntries.filter(({ page }) => page.includes("/(tabs)/"));
    expect(tabRoutes).toHaveLength(4);
    expect(tabRoutes).toEqual(
      expect.arrayContaining([
        {
          file: "./(public)/(tabs)/thoughts/index.tsx",
          page: "/(public)/(tabs)/thoughts/index",
        },
        {
          file: "./(public)/(tabs)/thoughts/[idOrKey]/index.tsx",
          page: "/(public)/(tabs)/thoughts/[idOrKey]/index",
        },
        {
          file: "./(public)/(tabs)/index.tsx",
          page: "/(public)/(tabs)/index",
        },
        {
          file: "./(public)/(tabs)/settings/index.tsx",
          page: "/(public)/(tabs)/settings/index",
        },
      ])
    );
    const publicRoutes = routeEntries
      .filter(({ page }) => page.startsWith("/(public)/") && !page.includes("/(tabs)/"))
      .map(({ page }) => page);
    expect(publicRoutes).toEqual(
      expect.arrayContaining([
        "/(public)/thoughts/create",
        "/(public)/thoughts/[idOrKey]/edit",
        "/(public)/settings/lock",
        "/(public)/settings/data/backup/index",
        "/(public)/settings/export",
      ])
    );
    expect(routes).toEqual(
      expect.arrayContaining([
        "/v2",
        "/v2/thoughts",
        "/v2/thoughts/create",
        "/v2/thoughts/:id",
        "/v2/thoughts/:id/edit",
        "/v2/settings",
        "/v2/settings/lock",
        "/v2/settings/data/backup",
        "/v2/settings/export",
      ])
    );
    expect(routeEntries).toEqual(
      expect.arrayContaining([
        {
          file: "./(public)/(tabs)/index.tsx",
          page: "/(public)/(tabs)/index",
        },
        {
          file: "./(public)/(tabs)/thoughts/index.tsx",
          page: "/(public)/(tabs)/thoughts/index",
        },
        {
          file: "./(public)/(tabs)/thoughts/[idOrKey]/index.tsx",
          page: "/(public)/(tabs)/thoughts/[idOrKey]/index",
        },
        {
          file: "./(public)/(tabs)/settings/index.tsx",
          page: "/(public)/(tabs)/settings/index",
        },
        {
          file: "./(public)/thoughts/create.tsx",
          page: "/(public)/thoughts/create",
        },
        {
          file: "./(public)/thoughts/[idOrKey]/edit.tsx",
          page: "/(public)/thoughts/[idOrKey]/edit",
        },
      ])
    );

    const tabsLayout = readSrcFile("app/v2/(public)/(tabs)/_layout.tsx");
    // Tab screens are rendered from TAB_CONFIG rather than declared inline;
    // verify the layout maps over it instead of matching literal JSX.
    expect(tabsLayout).toContain("TAB_CONFIG.map((tab) =>");
    expect(tabsLayout).toContain("<Tabs.Screen");
    expect(tabsLayout).toContain("key={tab.name}");
    expect(tabsLayout).toContain("name={tab.name}");
    expect(tabsLayout).toContain("title: t(tab.labelKey)");
    // Visible tab chrome is owned by MainTabBar, not the default tab bar.
    expect(tabsLayout).toContain(
      'import { MainTabBar } from "@/src/components/navigation/main-tab-bar"'
    );
    expect(tabsLayout).toContain("tabBar={(props) => <MainTabBar {...props} />}");

    const mainTabBar = readSrcFile("components/navigation/main-tab-bar.tsx");
    expect(mainTabBar).toContain("state.routes.map");
    expect(mainTabBar).toContain("navigation.navigate(route.name)");

    const mainTabItem = readSrcFile("components/navigation/main-tab-item.tsx");
    expect(mainTabItem).toContain('accessibilityRole="tab"');
    expect(mainTabItem).toContain("accessibilityState={{ selected }}");

    const tabsConfig = readSrcFile("constants/tabs-config.ts");
    expect(
      Array.from(tabsConfig.matchAll(/name:\s*"([^"]+)"/g), ([, name]) => name)
    ).toEqual(["thoughts", "index", "settings/index"]);
    expect(tabsConfig).toContain('labelKey: "settings.hub.journal.label"');
    expect(tabsConfig).toContain('labelKey: "settings.hub.home.label"');
    expect(tabsConfig).toContain('labelKey: "accessibility.settings_button"');
    expect(tabsConfig).toContain('icon: "book-open"');
    expect(tabsConfig).toContain('icon: "home"');
    expect(tabsConfig).toContain('icon: "settings"');

    const publicLayout = readSrcFile("app/v2/(public)/_layout.tsx");
    expect(publicLayout).not.toMatch(/name="thoughts\/\[idOrKey\]\/index"/);
    expect(publicLayout).not.toMatch(/name="settings(?:\/|"|$)/);
    expect(publicLayout).not.toMatch(/name="settings\/lock"/);
    expect(publicLayout).not.toMatch(/name="settings\/data\/backup"/);
    expect(publicLayout).not.toMatch(/name="settings\/export"/);
  });
});
