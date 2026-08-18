import {
  BACKUP_EXPORT_FILENAME,
  BACKUP_EXPORT_MIME_TYPE,
  BACKUP_IMPORT_MIME_TYPES,
} from "@/src/platform/sharing/backup-mime";

test("export mime type is not text/plain", () => {
  // Android's built-in share-sheet "Save" target rejects text/plain
  // payloads ("Can't save text. Try saving a link instead.") — see
  // .dev/data-compatibility/verification/results/backup/BACKUP-002-v2-android-emulator.md.
  // The archive content is a compressed binary-ish envelope, not text,
  // so text/plain was an inaccurate label regardless.
  expect(BACKUP_EXPORT_MIME_TYPE).not.toBe("text/plain");
});

test("export mime type is the wildcard, not a narrow type", () => {
  // application/octet-stream fixed "Save" but dropped the share chooser
  // from 5 targets to 3 (Drive, Gmail, Quick Share only) — Android's
  // ACTION_SEND chooser only lists apps whose manifest <intent-filter>
  // matches the declared MIME type, and most messaging/notes apps filter
  // on text/* or similar, not application/octet-stream. See
  // .dev/data-compatibility/verification/results/backup/BACKUP-003-v2-android-emulator-fail-013-reverify.md.
  // "*/*" is the standard Android wildcard that matches every app's
  // share-target filter. This has regressed twice already via
  // well-intentioned narrowing, so pin the exact value.
  expect(BACKUP_EXPORT_MIME_TYPE).toBe("*/*");
});

test("import mime types accept both the current export type and the legacy text/plain type", () => {
  expect(BACKUP_IMPORT_MIME_TYPES).toContain(BACKUP_EXPORT_MIME_TYPE);
  expect(BACKUP_IMPORT_MIME_TYPES).toContain("text/plain");
});

test("export filename has no extension", () => {
  // The exported file was previously named with a .txt extension while
  // declaring an application/octet-stream MIME type — a mismatch that may
  // be why Android's built-in "Save" share target stopped offering the
  // file (see BACKUP-003-v2-android-emulator-fail-013-reverify.md). This
  // doesn't confirm a fix, only that the filename and MIME type no longer
  // disagree about content type.
  expect(BACKUP_EXPORT_FILENAME).not.toContain(".");
});
