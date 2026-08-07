export type BackupFeatureConfiguration = {
  encryptedBackupEnabled: boolean;
  forceLegacyBackup: boolean;
};

export function isEncryptedBackupEnabled(
    configuration: BackupFeatureConfiguration
): boolean {
  return (
      configuration.encryptedBackupEnabled &&
      !configuration.forceLegacyBackup
  );
}