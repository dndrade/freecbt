// Android's built-in share-sheet "Save" target rejects text/plain payloads
// with "Can't save text. Try saving a link instead." (confirmed on-device).
// The backup archive is a compressed, non-text envelope (see
// src/model/archive/thoughts-archive.ts), so text/plain was never an
// accurate label.
//
// Switching to application/octet-stream fixed "Save" but traded it for a
// worse regression: Android's ACTION_SEND chooser only lists apps whose
// manifest <intent-filter> matches the declared MIME type (exact match,
// subtype wildcard, or full */* wildcard), and most messaging/notes apps
// filter on text/* or similar — not application/octet-stream. That dropped
// the chooser from 5 targets to 3 (Drive, Gmail, Quick Share only; Signal,
// WhatsApp, Messages, Bluetooth, etc. all silently excluded), confirmed
// on-device.
//
// "*/*" is the standard Android wildcard that matches every app's
// share-target intent-filter, restoring the full chooser list. It's broader
// than application/octet-stream, not narrower, so it should not reintroduce
// the "Save" rejection that text/plain caused — that rejection was about
// text/plain's content handling, not about the MIME label being too broad —
// but this has not been re-verified on-device. text/plain stays in the
// import list so files exported before this change can still be
// re-imported.
export const BACKUP_EXPORT_MIME_TYPE = "*/*";
export const BACKUP_IMPORT_MIME_TYPES: readonly string[] = [
  BACKUP_EXPORT_MIME_TYPE,
  "text/plain",
];

// A prior device re-verification found Android's "Save" share target no
// longer offered after the MIME type above changed to
// application/octet-stream, while the exported filename still ended in
// .txt. No extension avoids re-introducing a filename/MIME mismatch.
export const BACKUP_EXPORT_FILENAME = "FreeCBT-backup";
