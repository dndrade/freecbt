# PR6 — Compatibility and Migration Code (io-ts removal)

## Context

`DEAD_CODE_AUDIT.md` (`.dev/archive/24-7-test-run/DEAD_CODE_AUDIT.md`) documented
`expo54/src/legacy/**` (since renamed to `expo54/src/compat/**` in PR5) and
proposed a six-PR cleanup sequence. PRs 1–5 have merged; `src/compat/` today
contains only:

- `io-ts/**` — a self-contained, unused historical codec library (thought,
  distortion, and archive codecs built on `io-ts`/`fp-ts`) that once decoded
  persisted user data before the migration to `src/model`'s `zod`-based
  decoders.
- `async-state.ts`, `i18n.ts`, `setting/**` — restored dependencies of
  `io-ts/**` (specifically `thought/store.ts` and `distortion/distortion.ts`)
  that a prior cleanup pass initially deleted and had to restore.

This is PR6 from the audit: land fixture-based regression tests proving the
live `zod` decoders in `src/model/` handle every old-format case the `io-ts`
codecs handled, then delete `src/compat/io-ts/**` (and its now-unreachable
dependencies) once those tests exist and pass.

The audit flagged this as asymmetric-risk work: deleting a codec that once
decoded real persisted data carries silent-failure risk if the new decoders
are missing an edge case. Investigation during this brainstorming session
found exactly such a case (see PR A below), confirming the audit's caution
was warranted.

## Scope

Three sequential, independently revertible PRs, in this order. Each depends
on the previous one being merged into `dndrade/main` first.

### PR A — Fix legacy `selected` filtering + regression test

**Bug found:** `src/model/thought.ts`'s `LegacyJson` schema does not declare
a `selected` field on `cognitiveDistortions` entries. Because zod object
schemas strip unknown keys by default, any `selected` value in old persisted
data is silently dropped during parsing, before `fromJson`'s decode function
runs. That decode function then maps every legacy `cognitiveDistortions`
entry to its slug unconditionally — so a distortion persisted with
`selected: false` is incorrectly treated as selected after decode.

The old `io-ts` codec (`src/compat/io-ts/thought/index.test.ts`, "thought
from legacy" test) filtered these out correctly: a legacy thought with one
distortion `selected: true` and another `selected: false` decoded to a
`Thought` containing only the selected one.

Verified empirically during this session: decoding
`{ cognitiveDistortions: [{slug: "all-or-nothing", selected: true}, {slug: "mind-reading", selected: false}] }`
through the current `Thought.createParsers(DistortionData).fromJson`
produces a `Thought` containing **both** distortions — `mind-reading`
should have been excluded.

**Fix:**

- Add `selected: z.boolean().optional()` to `LegacyJson`'s
  `cognitiveDistortions` item schema in `src/model/thought.ts`.
- In `fromJson`'s decode, drop entries where `selected === false` before
  mapping the remaining entries to slugs. Entries with `selected: true` or
  no `selected` field at all are kept (absence means "assume selected").
  This matches old behavior for the plain-string legacy format, which had
  no `selected` concept at all and was always kept. It is a deliberate,
  low-risk divergence from the old `io-ts` codec's *object*-format behavior:
  that codec's `FilterSelected` (`src/compat/io-ts/distortion/legacy.ts`)
  was a truthy-only filter (`enc.filter((l) => !!l.selected)`) that dropped
  entries with an absent `selected` field, rather than keeping them. Real
  persisted legacy data always had `selected` explicitly set — the old
  encoder always wrote `selected: true` — so this divergence has low
  real-world impact, which is why it was accepted rather than "fixed" to
  match the old object-format behavior exactly.

**Test:** add a case to `src/model/thought.test.ts` reproducing the fixture
above (legacy thought with a `selected: true` and a `selected: false`
distortion), asserting only the selected distortion survives decode.

### PR B — Port remaining io-ts fixtures into `src/model/*.test.ts`

For each old `io-ts` test file, port the assertions that test our own compat
logic (not `io-ts`/`fp-ts` library mechanics) into the corresponding
`src/model` test file, as new `test()`/`test.each()` cases using the live
`zod` parsers (`Thought.createParsers`, `Distortion.createParsers`,
`ThoughtsArchive.createParsers`, all parameterized with `DistortionData`).

- **`src/compat/io-ts/thought/index.test.ts` → `src/model/thought.test.ts`**
  - "thought from persist": encode/decode round-trip via `T.toJson`; decode
    failure on an unknown distortion slug; decode failure on a malformed
    `createdAt` (non-ISO string, and a non-string number).
  - "thought from legacy": decode of the legacy shape with mixed
    string/`{slug}`-object `cognitiveDistortions`, both with and without a
    `v` field present. The `selected: false` filtering case is already
    covered by PR A's test and is not duplicated here.

- **`src/compat/io-ts/distortion/index.test.ts` → `src/model/distortion-data.test.ts`**
  - "decodes legacy and id": decode from a bare slug string; decode from a
    `{slug, selected}` object; decode failure on a bogus slug.
  - "Codec-set filters selected": decoding a set/list of legacy distortions
    where `selected: false` entries are filtered out.
  - **Open implementation-time question:** the old `SetCodec` decoded
    directly from an array of raw `{slug, selected}` objects. Whether
    `Distortion.createParsers(...).fromSlugSet` in `src/model/distortion.ts`
    already supports this shape, or needs a small adapter, is to be
    confirmed while writing this PR — not decided here, since PR A's fix
    already covers the equivalent case at the `Thought` level.

- **`src/compat/io-ts/archive.test.ts` + `__snapshots__/archive.test.ts.snap`
  → `src/model/thoughts-archive.test.ts`**
  - Decode the existing base64-encoded snapshot strings (`empty`,
    `nonempty`, and `multiple`, ported as literal fixtures extracted from
    the `.snap` file rather than depending on jest snapshot mechanics)
    using `ThoughtsArchive.createParsers(DistortionData).fromString.decode`,
    asserting the result matches an explicit `Archive` literal built via
    `ThoughtsArchive.create(...)`. Add a round-trip encode/decode check
    with live data to confirm the wire format itself (not just the JSON
    shape) is still readable.

- **`src/compat/io-ts/io-ts.test.ts`**: not ported. It exercises
  `io-ts`/`io-ts-types` library behavior directly, with no fixtures and no
  reference to `Thought`/`Distortion`/`Archive` code, so it has no
  compatibility value. Deleted outright in PR C.

### PR C — Delete `src/compat/io-ts/**` and its now-unreferenced dependents

**Precondition:** PR A and PR B merged.

**Delete:**

- `src/compat/io-ts/**` (all codecs, tests, `__snapshots__/`).
- `src/compat/async-state.ts` — only importer repo-wide is
  `src/compat/io-ts/thought/store.ts`; its own test (`async-state.test.ts`)
  was already removed in an earlier cleanup pass, so there is nothing extra
  to drop.
- `src/compat/i18n.ts` — only importer repo-wide is
  `src/compat/io-ts/distortion/distortion.ts`.
- `src/compat/setting/**` — only importer repo-wide is `src/compat/i18n.ts`.
- The now-empty `src/compat/` directory itself.

Confirmed via repo-wide grep (session-time check, to be re-run immediately
before this PR per the audit's "rerun proof commands before deletion"
guidance) that none of the above have importers outside this dependency
chain.

**Dependency cleanup:** if a repo-wide grep for `io-ts`, `io-ts-types`, and
`fp-ts` imports (outside `node_modules`) returns nothing after the deletion,
remove those three packages from `expo54/package.json` in this same PR.

**Validation** (per audit §11):

- `npx tsc --noEmit` — clean.
- Full `yarn jest` / `npm test` run — passing, including PR A/B's new
  regression tests (which now assert only against `src/model`, which is
  correct — their purpose was always to prove `src/model` handles these
  cases, independent of whether `src/compat/io-ts` still exists).
- `expo lint` — clean.
- Repo-wide grep for `src/compat`, `io-ts`, `fp-ts` outside
  `node_modules`/`package.json` — no hits.

## Out of scope

- `src/app/v2/debug/**` production-exposure question (audit §12.1) —
  unrelated product decision, not touched here.
- Any further `src/compat/` restructuring beyond deletion — after PR C,
  nothing remains under `src/compat/`.

## Risks

- **Primary risk (addressed by PR A):** the `selected`-filtering gap means
  real users with old AsyncStorage data containing unselected legacy
  distortions would see incorrect distortions after upgrade, *silently*,
  since nothing currently exercises this path. This is the concrete
  instance of the risk the original audit predicted in the abstract.
- **Residual risk:** the `fromSlugSet` shape question in PR B may surface
  another small gap; if so, it will be fixed in PR B alongside its
  regression test, following the same pattern as PR A.
