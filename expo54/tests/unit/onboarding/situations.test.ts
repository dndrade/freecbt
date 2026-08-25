import { DistortionData } from "@/model";
import {
  situationIds,
  situations,
} from "@/features/onboarding/content/situations";

describe("onboarding situation content", () => {
  it("has exactly three situations, each with a title, detail, and auto-thought", () => {
    expect(situationIds).toEqual(["interview", "message", "mistake"]);
    for (const id of situationIds) {
      const s = situations[id];
      expect(s.title).toBeTruthy();
      expect(s.detail).toBeTruthy();
      expect(s.autoThought).toBeTruthy();
    }
  });

  it("every situation has exactly 3 distortion slugs that exist in the real distortion data", () => {
    for (const id of situationIds) {
      const slugs = situations[id].distortionSlugs;
      expect(slugs).toHaveLength(3);
      for (const slug of slugs) {
        expect(DistortionData.bySlug.has(slug)).toBe(true);
      }
    }
  });

  it("every situation has exactly 4 evidence statements and 4 alternative-thought phrases", () => {
    for (const id of situationIds) {
      expect(situations[id].evidence).toHaveLength(4);
      expect(situations[id].phrases).toHaveLength(4);
    }
  });

  it("does not use overgeneralization, which has no translated one-liner", () => {
    for (const id of situationIds) {
      expect(situations[id].distortionSlugs).not.toContain(
        "overgeneralization",
      );
    }
  });
});
