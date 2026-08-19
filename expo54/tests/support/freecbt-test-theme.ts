/**
 * Jest/jsdom-only FreeCBT theme bootstrap.
 *
 * Production styling is authoritative in global.css + src/theme/freecbt.css.
 * Jest does not run Metro/Uniwind's CSS compilation pipeline, so HeroUI's
 * useCSSVariable() calls would otherwise resolve missing variables and fall
 * back to invalid literals (e.g. react-native-svg's "invalid" is not a valid
 * color or brush warning).
 *
 * Under Jest, `uniwind`'s package resolution picks its React Native runtime
 * (uniwind/src/hooks/useCSSVariable/getVariableValue.native.ts), which reads
 * variables from an in-memory `UniwindStore`, not from any DOM/CSSOM — this
 * holds even for test files that opt into the jsdom test environment via a
 * `@jest-environment jsdom` docblock, since environment selection doesn't
 * change which platform variant of a package gets required. Injecting a
 * `<style>` tag into `document.head` is therefore inert here; verified
 * empirically that `useCSSVariable()` still misses every variable when only
 * a stylesheet is injected.
 *
 * `Uniwind.updateCSSVariables(theme, vars)` (exported publicly from
 * 'uniwind') is the same call the library itself uses at runtime for
 * dynamic theming, so this uses it to seed the store directly instead of
 * reaching into uniwind's internals.
 *
 * Every value below is a literal, already resolved from
 * src/theme/freecbt.css (FreeCBT overrides) or
 * heroui-native/src/styles/{variables,theme}.css (HeroUI defaults FreeCBT
 * doesn't override) — never a var() reference, since this only mirrors
 * the *compiled* output, not Uniwind's CSS compiler.
 *
 * Tests default to the FreeCBT light theme.
 */
import { Uniwind } from "uniwind";

let installed = false;

const FREECBT_LIGHT_THEME_VARS: Record<string, string> = {
  // HeroUI library theme selector (heroui-native/src/styles/variables.css)
  "--theme": "default",

  // Base
  "--color-background": "oklch(0.991 0 0)",
  "--color-foreground": "oklch(0 0 0)",

  // Surfaces (src/theme/freecbt.css)
  "--color-surface": "oklch(0.969 0.007 261)",
  "--color-surface-foreground": "oklch(0 0 0)",
  "--color-surface-secondary": "oklch(0.956 0.016 275)",
  "--color-surface-secondary-foreground": "oklch(0 0 0)",
  "--color-surface-tertiary": "oklch(0.940 0.018 275)",
  "--color-surface-tertiary-foreground": "oklch(0 0 0)",

  // Overlays
  "--color-overlay": "oklch(1 0 0)",
  "--color-overlay-foreground": "oklch(0 0 0)",
  "--color-backdrop": "oklch(0 0 0 / 20%)",

  // Muted / Default
  "--color-muted": "#5f636f",
  "--color-default": "oklch(0.956 0.016 275)",
  "--color-default-foreground": "oklch(0 0 0)",

  // Brand / accent (--accent: var(--brand-blue) in src/theme/freecbt.css)
  "--color-accent": "oklch(0.580 0.183 271)",
  "--color-accent-foreground": "oklch(1 0 0)",

  // Component colors (not overridden by FreeCBT; heroui-native default light)
  "--color-segment": "oklch(100% 0 0)",
  "--color-segment-foreground": "oklch(0.2103 0.0059 285.89)",

  // Semantic state roles
  "--color-success": "#027a48",
  "--color-success-foreground": "#ffffff",
  "--color-warning": "#b54708",
  "--color-warning-foreground": "#ffffff",
  "--color-danger": "#b42318",
  "--color-danger-foreground": "#ffffff",
  "--color-disabled": "#e5e7eb",
  "--color-disabled-foreground": "#4b5563",

  // Fields
  "--color-field": "oklch(1 0 0)",
  "--color-field-foreground": "oklch(0 0 0)",
  "--color-field-placeholder": "#5f636f",
  "--color-field-border": "oklch(0 0 0 / 20%)",

  // Structure
  "--color-border": "oklch(0 0 0 / 20%)",
  "--color-separator": "oklch(0 0 0 / 20%)",

  // Interaction (--focus / --link: var(--accent) in src/theme/freecbt.css)
  "--color-focus": "oklch(0.580 0.183 271)",
  "--color-link": "oklch(0.580 0.183 271)",

  // background-inverse: var(--foreground); field-focus: var(--field-background)
  "--color-background-inverse": "oklch(0 0 0)",
  "--color-field-focus": "oklch(1 0 0)",

  // ---------------------------------------------------------------------
  // Below: heroui-native/src/styles/theme.css derives these via
  // color-mix(in oklab, ...), which jsdom/native cannot evaluate at test
  // time (verified empirically — the raw color-mix() text is returned
  // unparsed). Each is precomputed with culori (the same color library
  // uniwind itself uses to parse/format colors) from the base FreeCBT
  // tokens above, using the exact percentages theme.css declares. This is
  // the full documented HeroUI semantic set (matches useThemeColor's
  // THEME_COLORS list in heroui-native), not an open-ended reproduction of
  // Uniwind's CSS compiler — just its finite, known color-mix formulas.
  // ---------------------------------------------------------------------
  "--color-background-secondary": "#efefef", // background 96% + foreground 4%
  "--color-background-tertiary": "#e2e2e2", // background 92% + foreground 8%
  "--color-surface-hover": "#d9dbe0", // surface 92% + surface-foreground 8%
  "--color-default-hover": "#e1e3ee", // default 96% + default-foreground 4%
  "--color-accent-hover": "#637de9", // accent 90% + accent-foreground 10%
  "--color-success-hover": "#318759", // success 90% + white 10%
  "--color-warning-hover": "#be5b2e", // warning 90% + white 10%
  "--color-danger-hover": "#be4133", // danger 90% + white 10%
  "--color-field-hover": "#dedede", // field 90% + field-foreground 2%
  "--color-field-border-hover": "#0000004b", // field-border 88% + field-foreground 10%
  "--color-field-border-focus": "#00000068", // field-border 74% + field-foreground 22%
  "--color-default-soft": "#edf0fc80", // default 50% + transparent
  "--color-default-soft-foreground": "oklch(0 0 0)", // = default-foreground
  "--color-default-soft-hover": "#edf0fc99", // default 60% + transparent
  "--color-accent-soft": "#556de526", // accent 15% + transparent
  "--color-accent-soft-foreground": "#3d4faa", // accent 80% + foreground 20%
  "--color-accent-soft-hover": "#556de533", // accent 20% + transparent
  "--color-danger-soft": "#b4231826", // danger 15% + transparent
  "--color-danger-soft-foreground": "#85170f", // danger 80% + foreground 20%
  "--color-danger-soft-hover": "#b4231833", // danger 20% + transparent
  "--color-warning-soft": "#b5470826", // warning 15% + transparent
  "--color-warning-soft-foreground": "#642402", // warning 65% + foreground 35%
  "--color-warning-soft-hover": "#b5470833", // warning 20% + transparent
  "--color-success-soft": "#027a4826", // success 15% + transparent
  "--color-success-soft-foreground": "#014929", // success 70% + foreground 30%
  "--color-success-soft-hover": "#027a4833", // success 20% + transparent
  "--color-separator-secondary": "#c3c5c9", // surface 85% + surface-foreground 15%
  "--color-separator-tertiary": "#b7b9bd", // surface 81% + surface-foreground 19%
  "--color-border-secondary": "#aeb0b3", // surface 78% + surface-foreground 22%
  "--color-border-tertiary": "#8a8c8f", // surface 66% + surface-foreground 34%
};

/**
 * Seeds Uniwind's runtime variable store with a resolved FreeCBT light-theme
 * mirror, once per Jest module registry (`jest.resetModules()` or a new
 * test file both get a fresh `uniwind` module instance, so this re-installs
 * automatically when needed; the `installed` guard just avoids redundant
 * work within a single module instance).
 */
export function installFreeCBTTestTheme() {
  if (installed) return;
  installed = true;

  Uniwind.updateCSSVariables(Uniwind.currentTheme, FREECBT_LIGHT_THEME_VARS);
}
