<div align="center">

# FreeCBT — Post-Cleanup Architecture Baseline (First Full Look at the Clean expo54 Tree)

_log of things noticed during codebase exploration._
_Not a roadmap. No priority. No assignees._

Sources: `npx madge --extensions ts,tsx --circular src` (real dependency-graph analysis,
not inference) · full read of `expo54/src/model/*`, `expo54/src/view/*`,
`expo54/src/hooks/*`, `expo54/src/app/v2/**` directory structure and representative
files · `.dev/audits/audit-log-002-ui-architecture-security.md` ·
`.dev/audits/audit-log-008-release-blockers-crossref.md` · live repo at `dndrade/main`,
commit `95bd312` (2026-07-25).

</div>

## Why this audit exists

Every prior audit looked at the codebase while the legacy `src/legacy`/`(legacy)` tree
and the io-ts/fp-ts compat layer still existed, which made it hard to tell which
architectural problems belonged to the dead code and which belonged to the live
`expo54` app. That tree is now fully gone (`docs/superpowers/plans/*dead-code-audit*`,
merged through PR #19). This is the first audit against the genuinely clean tree, and
its purpose is narrow: describe what the current architecture actually *is* —
structurally, not stylistically — as a baseline for a future layered-architecture
redesign. It makes no recommendations.

## Current shape

```
expo54/src/
  app/v2/**        — Expo Router file-based routes (screens); (public)/ and debug/
  model/           — domain types + business logic + a hand-rolled reducer ("Action"/"Cmd")
  view/            — 7 files: a real mix of app-shell components and one leaf component
  hooks/           — React hooks: state loading, i18n, reminders, style, safe-area
  routes.ts, storage.ts, type-utils.ts, index.ts  — flat root-level utilities
```

There is no `components/`, `services/`, `constants/`, or `utils/` directory at all —
`model/`, `view/`, and `hooks/` are the entire non-routing surface. Screens under
`app/v2/(public)/**` range from 89 to 327 lines (`settings/index.tsx` largest,
`thoughts/create.tsx` 276 lines) and contain routing, data loading, form state, and
markup in the same file — there's no separate screen/component split to point to.

## Finding 1 — Confirmed circular dependencies, all barrel-file-induced

`madge` reports 5 real cycles, all rooted in the same cause:

```
1) model/index.ts > model/action.ts
2) model/action.ts > model/model.ts
3) model/index.ts > model/action.ts > model/model.ts > model/cmd.ts
4) model/index.ts > model/action.ts > model/model.ts > model/thought.ts
5) routes.ts > model/index.ts > model/action.ts > model/model.ts
```

`model/index.ts` is a barrel file that re-exports every sibling module:

```ts
export * as Action from "./action";
export * as Cmd from "./cmd";
...
export * as Thought from "./thought";
```

But `action.ts`, `cmd.ts`, and `thought.ts` in turn import back through that same
barrel (`import { Thought } from "."`, `import { Archive, Thought } from "."`) instead
of importing their sibling files directly. `routes.ts` imports the barrel too, pulling
the whole cycle in. This is the textbook barrel-file cycle pattern — nothing here is a
deep architectural entanglement, it's five modules routed through one re-export file
that doesn't need to exist in its current form.

`view/index.ts` is a second barrel (1 line, re-exports `image-path.ts`) but has no
cycle today — worth naming because the same pattern will recur if `view/` grows the
way `model/` did.

## Finding 2 — No smart/dumb (or any) component boundary exists

`view/`'s 7 files mix two genuinely different kinds of code with no folder or naming
signal to tell them apart:

- `kv-table.tsx` — a real leaf/presentational component: takes props, renders a table,
  no model or context import.
- `app-provider.tsx`, `auth-gateway.tsx`, `onboarding-gateway.tsx`,
  `download-or-share.tsx` — all import `model/`, `hooks/use-model`, or `expo-router`
  directly; these are stateful, business-logic-bearing components, not presentational
  ones.

Nothing distinguishes these categories today. A contributor (or an AI agent) adding a
new component has no structural cue for where "just render this" code should live
versus "this owns state/data" code — every prior UI bug audit finding a component
doing too much (e.g. `thoughts/create.tsx` at 276 lines) traces back to there being no
placeholder for the alternative.

## Finding 3 — `model/` conflates four distinct responsibilities in one flat folder

Fifteen files, no sub-grouping, doing at least four different jobs:

- **Domain types + codecs**: `thought.ts`, `distortion.ts`, `distortion-data.ts`,
  `settings.ts`, `thoughts-archive.ts` (zod schemas, encode/decode)
- **A hand-rolled Elm-style reducer**: `action.ts` (actions), `cmd.ts` (side-effect
  descriptions), `model.ts` (the reducer itself) — this is a real architectural
  pattern (paired with `hooks/use-elm-arch.tsx`), not an accident, but it's undocumented
  as such anywhere in the repo.
- **Async loading state machine**: `promise-state.ts`
- **Root-level utility functions**: `routes.ts`, `storage.ts`, `type-utils.ts` sit
  *outside* `model/` entirely despite `model/cmd.ts` and `model/model.ts` depending on
  `routes.ts` — so the domain layer already reaches upward past its own folder
  boundary to get a dependency it needs.

## Finding 4 — Security surface, re-confirmed unchanged from audit-002

- `model/settings.ts:17,29` — PIN stored as a plaintext string in unencrypted
  AsyncStorage.
- `view/auth-gateway.tsx` — plain string equality against that PIN, no attempt
  limiting, no lockout.
- No `expo-secure-store` (or any encrypted-storage library) anywhere in
  `package.json` or `src/`.
- `app/v2/debug/**` — 13 files, unguarded by `__DEV__` (re-confirmed from
  audit-log-008), one of which dumps raw AsyncStorage journal contents to screen.

This matters for the redesign specifically because there is currently no layer
boundary that could even *express* "this data path must go through encrypted
storage" — storage access (`storage.ts`) is a flat utility any module can import
directly, with no service-layer indirection to enforce a policy at.

## Finding 5 — Routing and domain logic are directly coupled

`routes.ts` (a domain-adjacent utility, lives at `src/` root) imports a route param
type directly from a specific screen file:
`import { SlideName } from "@/src/app/v2/(public)/thoughts/create"`. This is the
inverse of the expected direction — a routing/domain utility should not need to know
about one specific screen's internal exported type. It also means that file
participates in cycle #5 above.

## What this baseline does *not* cover

- No device-level testing was performed (matches the standing gap in
  audit-log-008 #2 — the E2E harness is broken, so this audit is static-analysis only).
- `app/v2/debug/**` internals were not read file-by-file beyond what audit-log-008
  already covered.
- No performance or bundle-size analysis was done.

This is a structural snapshot only, meant to be the "before" picture for whatever
target layered architecture gets designed next.
