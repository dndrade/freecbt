import {
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
