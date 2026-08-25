import { readSrcFile } from "@/tests/support/route-manifest";

/**
 * Assert against the raw @theme declarations rather than compiling through
 * Tailwind/Uniwind's native build pipeline (@tailwindcss/node, backed by the
 * lightningcss native binding): that compiler performs async native cleanup
 * that fires after Jest tears down the test file's module environment,
 * which leaves an open native handle and makes the *whole* suite's process
 * exit non-zero even though every assertion passes - only reproducible when
 * run alongside other test files, not in isolation. See
 * BACKUP-* style history in this repo for why "looked fine on its own" isn't
 * enough verification for a shared test process.
 *
 * A comment-aware raw-text parse is sufficient here: CSS comments don't
 * nest and aren't quote-sensitive (each /* pairs with the next *\/,
 * unconditionally), so stripping them with a single non-greedy regex before
 * asserting on the declarations catches the same class of mistake (a
 * declaration accidentally swallowed by an unrelated comment) without the
 * native compiler's side effects.
 */
function readThemeWithoutComments(): string {
  const css = readSrcFile("shared/theme/freecbt.css");
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("design tokens", () => {
  let css: string;

  beforeAll(() => {
    css = readThemeWithoutComments();
  });

  it("exposes the 4px spacing Base", () => {
    expect(css).toContain("--spacing: 4px;");
  });

  // Cross-platform scale converging Apple HIG Dynamic Type and Material 3.
  // Every line height is a multiple of 4 so text lands on the spacing grid.
  it.each([
    ["xs", 12, 16],
    ["sm", 14, 20],
    ["base", 16, 24],
    ["lg", 18, 24],
    ["xl", 20, 28],
    ["2xl", 24, 32],
    ["3xl", 28, 36],
    ["4xl", 32, 40],
  ])(
    "defines --text-%s at %ipx with a %ipx line height",
    (step, size, lineHeight) => {
      expect(css).toContain(`--text-${step}: ${size}px;`);
      expect(css).toContain(`--text-${step}--line-height: ${lineHeight}px;`);
      expect(lineHeight % 4).toBe(0);
    },
  );

  it("gives heroui headings a real weight", () => {
    // heroui expresses weight as a font-family swap, which collapses to the
    // unresolvable `system-ui` family on native; without this rule every
    // heading renders at regular weight.
    expect(css).toMatch(
      /\.text__root--type-h1[^{]*\{\s*font-weight: var\(--font-weight-semibold\)/,
    );
  });
});
