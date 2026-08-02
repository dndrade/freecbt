// Android's built-in share-sheet "Save" target rejects text/plain payloads
// with "Can't save text. Try saving a link instead." — see
// .dev/data-compatibility/verification/results/backup/BACKUP-002-v2-android-emulator.md.
// The backup archive is a compressed, non-text envelope (see
// src/model/thoughts-archive.ts), so text/plain was never an accurate
// label. application/octet-stream avoids the "Save" target's text-specific
// handling. text/plain stays in the import list so files exported before
// this change can still be re-imported.
export const BACKUP_EXPORT_MIME_TYPE = "application/octet-stream";
export const BACKUP_IMPORT_MIME_TYPES: readonly string[] = [
  BACKUP_EXPORT_MIME_TYPE,
  "text/plain",
];

// A prior device re-verification found Android's "Save" share target no
// longer offered after the MIME type above changed to
// application/octet-stream, while the exported filename still ended in
// .txt — see
// .dev/data-compatibility/verification/results/backup/BACKUP-003-v2-android-emulator-fail-013-reverify.md.
// No extension avoids re-introducing a filename/MIME mismatch.
export const BACKUP_EXPORT_FILENAME = "FreeCBT-backup";
