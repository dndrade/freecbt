import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.resolve(__dirname, "../../src");

// Centralizes the src-relative-path resolution duplicated across the
// integration tests that read real route/source files from disk, so a
// future relocation of tests/ only has to fix this one path.
export function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), "utf8");
}
