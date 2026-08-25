import { readSrcFile } from "@/tests/support/route-manifest";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const light = luminance(foreground);
  const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

describe("semantic theme contrast", () => {
  it("keeps state foregrounds readable on their semantic surfaces", () => {
    const css = readSrcFile("shared/theme/freecbt.css");
    for (const role of ["success", "warning", "danger", "disabled"]) {
      const surfaces = [
        ...css.matchAll(new RegExp(`--${role}: (#[0-9a-f]+);`, "g")),
      ].map(([, value]) => value);
      const foregrounds = [
        ...css.matchAll(new RegExp(`--${role}-foreground: (#[0-9a-f]+);`, "g")),
      ].map(([, value]) => value);
      expect(surfaces).toHaveLength(2);
      expect(foregrounds).toHaveLength(2);
      surfaces.forEach((surface, index) => {
        expect(contrast(foregrounds[index], surface)).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  });

  it("uses the strengthened light muted token", () => {
    const css = readSrcFile("shared/theme/freecbt.css");
    expect(css).toContain("--muted: #5f636f;");
  });
});
