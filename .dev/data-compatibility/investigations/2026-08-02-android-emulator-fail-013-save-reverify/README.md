# Investigation Log — Android Emulator: FAIL-013 "Save" Target Re-Verification

## Session Metadata

| Field | Value |
|---|---|
| Date logged | 2026-08-02 (session start, America/New_York) |
| Investigator | device driven via ADB relay set up by the repository owner |
| Target build | `dndrade/main` @ `9458cd1` (includes PR #43's `application/octet-stream` MIME fix) |
| Build variant | Debug APK, `assembleDebug`, single ABI (`x86_64`) |
| Device | Pixel-7-profile emulator (`sdk_gphone64_x86_64`, Android 16), reached via ADB relay `172.17.0.1:5038`, serial `emulator-5554` |
| Package | `org.erosson.freecbt` |
| Purpose | Re-run `BACKUP-002`'s "Save" system-share-target step now that the `text/plain` -> `application/octet-stream` fix (`FAIL-013`) is merged, with a screen recording this time to capture the toast's timing |
| Prior result being re-verified | `.dev/data-compatibility/verification/results/backup/BACKUP-002-v2-android-emulator.md` (`PARTIAL`, "Save" target failed with `text/plain`) |

## Findings

### Setup deviation: debug build needed Metro running, not documented in the task brief

The installed debug APK (`assembleDebug`) is a React Native debug build that loads its JS
bundle from a Metro dev server rather than an embedded bundle. The first deep-link launch
attempt hit a red-screen error: `Unable to load script... Make sure you're running Metro`.

Fix applied (read-only relative to the repo — no files edited):

- Started Metro: `yarn --cwd expo54 start` (background), confirmed via `curl localhost:8081/status` -> `packager-status:running`.
- Set up the reverse tunnel: `adb reverse tcp:8081 tcp:8081` (through the same ADB relay/serial as every other command).
- Force-stopped and relaunched the app via the same deep link. Metro bundled `node_modules/expo-router/entry.js` (2241 modules, ~16.6s), and the app then rendered normally.

This is an environment-setup gap worth carrying into later re-verification sessions: a
debug APK on this emulator needs both the ADB relay tunnel *and* a locally running Metro
bundler reachable via `adb reverse tcp:8081 tcp:8081`, or it never gets past the splash
screen.

### Step 2: v2 backup screen reached

Deep link `freecbt://v2/settings/backup` reached the same two-button layout as
`BACKUP-002`'s screenshot 08 (`screenshots/01-v2-backup-screen.png`): "Export and share
your FreeCBT data" and "Import your FreeCBT data".

### Step 3: Share sheet opens (real chooser, confirmed via dumpsys)

Tapped the export/share button at real-resolution coordinates **(539, 814)** (scaled from
the Read-tool preview's downscaled (449, 678) at the documented 1.2x factor for this
1080x2400 device). `topResumedActivity` moved to
`com.android.intentresolver/.ChooserActivityLauncher` — confirms a real system share
sheet opened, same as `BACKUP-002` (see `raw-logs/topresumed-after-share-tap.txt`).
Screenshot: `screenshots/02-share-sheet-opens.png` (note: the first capture, 1s after the
tap, raced the chooser animation and still showed the backup screen underneath; a second
capture ~2s after the tap shows the sheet — the file linked here is the corrected one).

### Step 4 — CRITICAL FINDING: the built-in "Save" target is gone, not fixed

**This blocks Task 4 as scoped.** The share sheet in this session lists only three
targets: **Quick Share, Drive, Gmail** (confirmed twice — once via screenshot, once via
a fresh `uiautomator dump` after closing and reopening the sheet; see
`raw-logs/share-sheet-uiautomator-dump.xml` and
`screenshots/03-share-sheet-no-save-target-confirmed.png`). There is no "Save" entry at
all, and the row is not horizontally scrollable/truncated — it's genuinely a 3-item list
(bounds only span x=[0,648] of the 1080-wide screen, left-aligned, matching how this
sharesheet lays out a short list rather than a full row).

Compare to `BACKUP-002` (`2026-07-28` session, same emulator profile, same Android 16
build, same deep link): that session's chooser showed **five** targets — Quick Share,
**Save**, Chrome, Drive, Messages — and tapping **Save** produced a toast, "Can't save
text. Try saving a link instead.", because the payload was `text/plain`.

This session's build carries PR #43's fix
(`expo54/src/platform/sharing/backup-mime.ts`: `BACKUP_EXPORT_MIME_TYPE =
"application/octet-stream"`, with a comment stating the intent is explicitly "avoids the
'Save' target's text-specific [rejection]"). The MIME type change is confirmed present in
this build. But empirically, changing the MIME type didn't make the "Save" target accept
the file — **it made the "Save" target stop being offered at all.** Android's built-in
sharesheet "Save" chip appears to be MIME-eligibility-gated (offered for `text/plain`,
apparently not offered for generic `application/octet-stream`), so the fix traded one
failure mode ("Save" appears and errors) for a different one ("Save" doesn't appear).

**Consequence for Task 4:** there is no "Save" target coordinate to record or tap. Task
4's plan (tap "Save," record the video, confirm success) cannot proceed as written — the
target doesn't exist in this share sheet with the fixed build. This needs a decision from
whoever is driving the plan before Task 4 continues: e.g., verify success via a different
target (Quick Share / Drive local-save equivalent), re-examine whether
`application/octet-stream` is really the right MIME choice if the goal was to keep "Save"
working, or treat "the built-in Save chip no longer shows up" itself as the finding to
report upstream instead of a successful save.

Reproducibility: re-tested by pressing back to dismiss the sheet, re-tapping the
export/share button, and re-dumping the UI hierarchy — identical three-target result both
times.

### Step 4 (redefined) — Finding: remaining targets accept the payload structurally; no rejection error reproduces

**Severity:** Informational / confirms FAIL-013 is still open with a different failure mode
than originally reported (see below), not a new defect in Quick Share or Drive themselves.

The repository owner redefined this task (2026-08-02) after the prior finding established
there is no "Save" target to tap in this build's share sheet. Rather than tapping a target
that doesn't exist, this step checked whether the sheet's *remaining* three targets — Quick
Share, Drive, Gmail — still accept the `application/octet-stream` payload without an
explicit rejection error, the way "Save" used to produce one
("Can't save text. Try saving a link instead.", per `BACKUP-002`).

**Reproduction steps taken:**

1. Started `adb shell screenrecord /sdcard/fail-013-remaining-targets.mp4` (confirmed
   running on-device via `ps -A | grep screenrecord` before proceeding).
2. Re-derived exact tap coordinates via a fresh `uiautomator dump`
   (`raw-logs/share-sheet-uiautomator-dump-task4-clickable-bounds.xml`) rather than scaling
   screenshot coordinates by eye — this found the three clickable `LinearLayout` containers
   at real-resolution bounds `[0,2044][216,2337]` (Quick Share), `[216,2044][432,2337]`
   (Drive), `[432,2044][648,2337]` (Gmail). An initial tap at a screenshot-scaled y-estimate
   (1606) missed the row entirely and hit blank sheet space with no effect; the dump-derived
   center points (y=2190) landed correctly on the first attempt afterward.
3. Tapped Quick Share at `(108, 2190)`. Result: a brief loading spinner, then Quick Share's
   own **"Set up Quick Share"** onboarding screen ("Choose your account and privacy
   settings" / "No one can share with you until you make yourself visible"). This is
   Quick Share's first-run setup flow (not configured in this emulator) — **not** an
   explicit rejection of the file. Screenshot: `screenshots/04-quick-share-result.png`.
4. Backed out of Quick Share (two `KEYCODE_BACK` presses landed back on the FreeCBT app,
   past the backup screen), re-entered via the deep link `freecbt://v2/settings/backup`
   (Metro re-bundled), re-tapped the export button at `(539, 814)`, and confirmed via
   screenshot that the share sheet reopened with the same three targets.
5. Tapped Drive at `(324, 2190)`. Result: an **"Upload to Drive"** dialog reading "Sign
   into or create a Google account to upload to Drive," with **Cancel** / **Setup account**
   buttons. This exactly matches `BACKUP-002`'s prior documented behavior on this same
   emulator profile (no Google account configured) — an environment limitation, not a
   rejection of the file itself. Confirms Drive still accepts the share intent
   structurally. Screenshot: `screenshots/05-drive-result.png`. Dismissed via **Cancel**
   afterward to leave the device idle.
6. Stopped the recording (`pkill -SIGINT screenrecord`, confirmed the process exited and
   the file existed at 3.5MB via `adb shell ls -la`), pulled it to
   `recordings/remaining-targets-attempt.mp4`, and removed the on-device copy. One
   recording covered both attempts — the ~3-minute `screenrecord` limit was not hit.

**Gmail was not attempted.** The brief's steps only called for Quick Share and Drive
(Gmail's structural-acceptance behavior — opening a compose screen with the file
attached — is not in question here; Gmail was never the target that produced a rejection
error in `BACKUP-002`, and the brief did not ask for it).

**Conclusion:** neither Quick Share nor Drive produced an explicit rejection error
comparable to Save's old "Can't save text. Try saving a link instead." toast. Both
structurally accepted the `application/octet-stream` share intent — Quick Share proceeded
into its own setup flow, Drive proceeded into its own sign-in flow. **This does not mean
FAIL-013 is resolved.** The specific target most users would reach for to "just save a
copy locally" — "Save" — is no longer offered as an option in this sheet at all (per the
prior finding above), so there is nothing to "accept structurally" or "reject" for that
use case anymore. FAIL-013 should be reported as **still open**, with a different failure
mode than originally filed: not "Save rejects the file with an error" but "Save no longer
appears as a share target in this build."

### Step 5 (redefined) — MediaStore query skipped, intentionally

The original Task 4 plan included querying Android's `MediaStore` after a successful local
save to confirm the file landed on disk. That step is not applicable here: it only makes
sense after a target that saves the file locally (the old "Save" target) completes
successfully. Since no such target exists in this share sheet anymore, and neither Quick
Share nor Drive write to local device storage via `MediaStore` (Quick Share transmits to a
nearby device; Drive uploads to a cloud account), there is nothing to query for. This step
is recorded here as explicitly skipped, not silently omitted.

### Manually confirmed: Drive upload completes end-to-end with real payload contents intact (owner-verified, outside the automated session)

After Task 4 concluded, the repository owner manually added a real Google account to the
emulator — something the automated session had no way to do — and completed the actual
Drive upload that Task 4 could only reach the sign-in prompt for (see
`screenshots/05-drive-result.png` above). The upload succeeded, and the owner confirmed the
resulting file is present in their Drive with intact contents: pasted back, it is a
well-formed FreeCBT encrypted export string (starts and ends with `:FreeCBT:`, with a
base64/binary-looking payload in between, consistent with the app's real export format per
`09-backup-archive-format.md`).

This does not change the `FAIL-013` result — the "Save" target itself is still absent from
the share sheet (see the CRITICAL FINDING above), so `FAIL-013` remains open. But it is a
meaningful positive data point: it shows the underlying export payload and the Drive
share-based pathway are genuinely functional end-to-end (real account -> real upload ->
intact, well-formed file), not just "structurally accepted, unconfirmed." The `FAIL-013`
regression is specific to the "Save" target's disappearance, not a broader breakage of the
share-based export mechanism.

### Logs

- `raw-logs/full-logcat.txt` — full capture from before the first deep-link launch through
  the second share-sheet open (includes the Metro-bundle-missing red screen, the app
  boot, and both chooser opens).
- `raw-logs/app-filtered-logcat.txt` — same window, filtered to lines matching
  `erosson|freecbt` (111 of 3926 lines).
- `raw-logs/topresumed-after-share-tap.txt` — `dumpsys activity activities |
  grep topResumedActivity` immediately after the export/share tap.
- `raw-logs/share-sheet-uiautomator-dump.xml` — `uiautomator dump` of the reopened share
  sheet, used to confirm the three-target list is genuine (not a rendering/scroll
  artifact) via `resolver_list`/`suggested_apps_container` bounds.
- `raw-logs/share-sheet-uiautomator-dump-task4-clickable-bounds.xml` — a second
  `uiautomator dump` of the same share sheet, taken during Task 4 to derive exact
  real-resolution tap coordinates for the three clickable target containers.
- `recordings/remaining-targets-attempt.mp4` — screen recording spanning the Quick Share
  tap, backing out, share-sheet reopen, and the Drive tap/dialog.
