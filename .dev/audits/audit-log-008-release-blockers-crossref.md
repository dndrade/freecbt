<div align="center">

# FreeCBT — Release-Blockers Crossref: Legacy, Broken, and Cleanup Items Before Migration Testing

_log of things noticed during codebase exploration._
_Not a roadmap. No priority beyond what's stated below. No assignees._

Sources: full read of `.dev/audits/*`, `.dev/issues/*`, `.dev/archive/24-7-test-run/DEAD_CODE_AUDIT.md`,
`docs/superpowers/specs/*`, `docs/superpowers/plans/*` · live repo state on `dndrade/main`
at commit `95bd312` (2026-07-25) · `npx tsc --noEmit` and `npx eslint` in `expo54/` ·
`npx jest` in `expo54/` · grep of `expo54/src` for `__DEV__`, `TODO`, debug/demo routes ·
`git log`/`git ls-files` for `expo47/` and route history.

</div>

## The question this is trying to answer

The 6-PR dead-code-audit sequence (`DEAD_CODE_AUDIT.md`) is fully executed and merged:
legacy UI/state/utils tree deleted, `src/legacy` renamed to `src/compat`, the
io-ts/fp-ts compat layer removed, and the orphaned `monocle-ts`/`newtype-ts`/`expo-haptics`
dependencies removed. That work is done. This audit asks what's *left* — specifically
what is still legacy, broken, or in genuine need of cleanup — before it's worth starting
real migration testing or UI-fixing work on the 2.5 release.

Baseline confirmed at the time of this audit: `jest` 10 suites / 40 tests pass; `eslint`
0 errors, 2 warnings; `tsc --noEmit` has exactly 1 error. Everything below is either a
hard blocker to testing at all, or something that should close before UI-fixing work
starts, ordered by how much it blocks the rest.

## 1. No root route — the app has no `/` entry point (confirmed open, hard blocker)

`expo54/src/app/` contains only `v2/`; there is no `src/app/_layout.tsx`, no
`src/app/index.tsx`, no `+not-found.tsx`. `expo54/.expo/types/router.d.ts`'s route
union lists only `/_sitemap` and `/v2/**` — `/` is unmapped. The old `/` was
`src/app/(legacy)/index.tsx`, deleted in `05108cb`.

Cold launch — native scheme `freecbt://`, and web at `/webapp/` — lands on Expo
Router's unmatched-route screen. Nothing can be manually tested until `/` redirects to
`/v2`. This also forces a product decision left open since the audit doc: keep the
`/v2` URL prefix, or promote it to root now that there's no `v1` to disambiguate
against.

## 2. E2E/verification harness is broken (confirmed open, blocks "migration testing" itself)

`.dev/audits/audit-log-007-settings-reactivity-v2-verification-results.md` ends "Web
E2E verification: blocked by stale selectors." Still true:
`expo54/e2e/page-model.ts:19,20,37` use `getByText("FreeCBT")` (matches 4 elements,
fails in strict mode) and `getByPlaceholder("might crash")` (no longer the actual
placeholder text). No `testID`s exist anywhere in the app to give the harness a
stable target.

The `settings-reactivity.test.ts` suite exists only under
`.dev/archive/24-7-test-run/e2e/pages/` — it never landed in `expo54/e2e/`. CI
(`.github/workflows/integrate.yml`) runs jest only; `playwright.yml` and `apk.yml` are
`workflow_dispatch`-only and effectively unmaintained.

Still pending per audit-007: reminders device verification and PIN-lifecycle
verification. F-007 ("data persistence across upgrades" — audit-007's own
highest-severity case) and F-008 (63 blank test executions logged since January 2026)
remain unexecuted.

## 3. Debug surface shipped to production (confirmed open — product decision, flagged in DEAD_CODE_AUDIT §12)

13 files under `expo54/src/app/v2/debug/**` are real, reachable routes;
`grep -rn __DEV__ expo54/src` returns **zero hits** — none of it is gated out of
production builds. `debug/tools/asyncstorage-dump.tsx` dumps raw journal contents from
storage; `debug/tools/debug.tsx:90,105` `console.log`s decoded thought content.
`/_sitemap` is also exposed alongside it.

## 4. The type/lint gate isn't clean (confirmed open, small, free to fix alongside #3)

The one remaining `tsc` error is the known `TS1360` in
`src/app/v2/debug/demos/hooks-init/use-model2.tsx:183`. The same file holds the app's
only eslint warning (unused variable `w`, line 66). Both live inside the debug-demo
tree from item 3 — gating or deleting that tree clears this for free.

## 5. Reminders are hard-coded iOS-only (confirmed open, blocks reminders testing)

`src/hooks/use-reminders.ts:11-12`: `isSupported: () => Platform.OS === "ios"`, with a
`// TODO ... wait til the big v2 release is done to enable it` comment. Android
reminders are intentionally disabled, and reminders can't be exercised on web at all.
`expo-notifications` also needs a dev client — Expo Go dropped support for it in SDK
53 (per audit-005). This needs an explicit decision before any reminders test pass is
planned.

## 6. Sensitive-data posture is unresolved (confirmed open, needs a release decision)

`src/model/settings.ts:17,29` store the app PIN as a plaintext string in unencrypted
AsyncStorage; `src/view/auth-gateway.tsx:23` checks it with plain equality and no
attempt limiting. `expo-secure-store` is not used anywhere in the app. This was called
out as the top architectural item in `audit-log-002-ui-architecture-security.md` and
is unchanged since.

## 7. UI/i18n bug backlog — the actual "UI fixing" work, unblocked once 1–2 close

- 6 untranslated, `*`-prefixed headers in `src/locals/en.json:116,122,130,139,147,152`.
- Backup MIME filter still narrowed to `type: ["text/plain"]`
  (`settings/backup.tsx:103`).
- `thoughts/create.tsx` ends with a single submit button — no "add another" or
  "go to index" affordance, as previously flagged.
- Two items from the prior audit (F-003/F-004) remain unverifiable without a physical
  device.

This category is real UI work, not cleanup, but verifying any of it depends on having
a working root route (item 1) and a working E2E harness (item 2) to check against.

## 8. Stale scaffolding — likely safe to close, needs a decision rather than investigation

- `expo47/` contains only `node_modules` and is fully untracked
  (`git ls-files expo47` returns nothing) — yet `.github/workflows/apk.yml` still
  builds from it.
- `CONTRIBUTING.md` still documents the pre-workspace repo layout.
- A handful of stray commented-out debug lines remain at `auth-gateway.tsx:36`,
  `onboarding-gateway.tsx:24-27`, `backup.tsx:112`.

## Suggested order of attack

1 (root route) → 2 (E2E harness) → 3/4 together (debug tree gating clears the lint
error too) → 5/6 as explicit release decisions → 7 (UI backlog, once 1/2 are fixed) →
8 whenever convenient.
