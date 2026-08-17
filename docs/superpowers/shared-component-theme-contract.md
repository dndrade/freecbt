# Shared Component Theme Contract

This repo keeps a single shared UI boundary:

- `HeroUI Native` owns primitives, accessibility, animation, and base semantics.
- `src/theme/` owns the semantic token contract and runtime theme sync.
- `src/components/` owns reusable FreeCBT compositions only.
- `src/features/*/ui/` owns feature-specific UI.

Shared components must consume existing semantic roles first:

- colors from theme roles such as `background`, `surface`, `accent`, `separator`, `muted`, `border`, and `foreground`;
- spacing from the standard Uniwind/Tailwind scale;
- typography from HeroUI text primitives;
- radius and surface treatment from HeroUI/Uniwind theme tokens when available.

Rules for shared UI:

- do not introduce arbitrary palette names in shared components;
- do not add new token families unless an existing semantic role cannot express the shared need;
- do not use bracket spacing or ad hoc pixel values when the standard scale fits;
- preserve VoiceOver and TalkBack semantics on every shared interactive composition;
- keep platform-specific forks out of shared UI unless iOS and Android genuinely need different behavior.

`SegmentedProgress` is a shared FreeCBT composition because it is used by multiple production flows. It should stay segmented-only visually while exposing meaningful progress semantics to assistive tech.
