import {
  BACKUP_EXPORT_FILENAME,
  BACKUP_EXPORT_MIME_TYPE,
  BACKUP_IMPORT_MIME_TYPES,
} from "./backup-mime";

test("export mime type is not text/plain", () => {
  // Android's built-in share-sheet "Save" target rejects text/plain
  // payloads ("Can't save text. Try saving a link instead.") — see
  // .dev/data-compatibility/verification/results/backup/BACKUP-002-v2-android-emulator.md.
  // The archive content is a compressed binary-ish envelope, not text,
  // so text/plain was an inaccurate label regardless.
  expect(BACKUP_EXPORT_MIME_TYPE).not.toBe("text/plain");
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
