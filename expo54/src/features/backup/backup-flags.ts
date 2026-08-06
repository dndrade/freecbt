import { isEncryptedBackupEnabled } from "./backup-feature";

/**
 * Development rollout switch.
 *
 * Production always resolves to the legacy backup implementation.
 * Change this value to disable the encrypted controls during development.
 */
const ENABLE_ENCRYPTED_BACKUP_IN_DEVELOPMENT = true;

export const backupFlags = {
    encryptedBackup: isEncryptedBackupEnabled({
        isDevelopment: __DEV__,
        encryptedBackupInDevelopment:
        ENABLE_ENCRYPTED_BACKUP_IN_DEVELOPMENT,
    }),
} as const;