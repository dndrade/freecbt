import { backupFlags } from "./backup-flags";

describe("backupFlags", () => {
    test("defaults to legacy backup", () => {
        expect(backupFlags.encryptedBackup).toBe(false);
    });
});
