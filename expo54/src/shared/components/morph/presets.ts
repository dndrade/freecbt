/**
 * Named, reusable transformation configs. Adding a new transformation is
 * adding a new key here, not new animation code
 */
export const MORPH_PRESETS = {
  /** A circular icon button resizing into a labeled pill. Currently used by
   * onboarding's Next -> Get Started button (MorphAction). */
  iconToLabel: {
    container: {
      from: { width: 48, borderRadius: 24 },
      to: { width: 160, borderRadius: 12 },
    },
  },
} as const;
