import { isEncryptedBackupEnabled } from "./backup-feature";

/**
 * Development rollout switch.
 *
 * Production always resolves to the legacy backup implementation.
 * Change this value to disable the encrypted controls during development.
 *
 * Set FORCE_LEGACY_BACKUP to true for an emergency rollback without
 *  removing the encrypted backup implementation or its compatibility code.
 */

const ENABLE_ENCRYPTED_BACKUP = false;
const FORCE_LEGACY_BACKUP = false;

export const backupFlags = {
    encryptedBackup: isEncryptedBackupEnabled({
        encryptedBackupEnabled: ENABLE_ENCRYPTED_BACKUP,
        forceLegacyBackup: FORCE_LEGACY_BACKUP,
    }),
} as const;