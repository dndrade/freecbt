export type BackupFeatureEnvironment = {
  isDevelopment: boolean;
  encryptedBackupInDevelopment: boolean;
};

export function isEncryptedBackupEnabled(
  environment: BackupFeatureEnvironment
): boolean {
  return (
    environment.isDevelopment &&
    environment.encryptedBackupInDevelopment
  );
}
