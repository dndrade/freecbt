import { backupFlags } from "@/src/features/backup/backup-flags";

describe("backupFlags", () => {
    test("defaults to legacy backup", () => {
        expect(backupFlags.encryptedBackup).toBe(false);
    });
});
