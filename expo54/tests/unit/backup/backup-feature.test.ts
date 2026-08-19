import { isEncryptedBackupEnabled } from "@/src/features/backup/backup-feature";

describe("isEncryptedBackupEnabled", () => {
    test("is disabled when encrypted backup is not enabled", () => {
        expect(
            isEncryptedBackupEnabled({
                encryptedBackupEnabled: false,
                forceLegacyBackup: false,
            })
        ).toBe(false);
    });

    test("is enabled when encrypted backup is enabled", () => {
        expect(
            isEncryptedBackupEnabled({
                encryptedBackupEnabled: true,
                forceLegacyBackup: false,
            })
        ).toBe(true);
    });

    test("the rollback switch disables encrypted backup", () => {
        expect(
            isEncryptedBackupEnabled({
                encryptedBackupEnabled: true,
                forceLegacyBackup: true,
            })
        ).toBe(false);
    });

    test("the rollback switch remains legacy when encrypted backup is already disabled", () => {
        expect(
            isEncryptedBackupEnabled({
                encryptedBackupEnabled: false,
                forceLegacyBackup: true,
            })
        ).toBe(false);
    });
});