import { isEncryptedBackupEnabled } from "./backup-feature";

describe("isEncryptedBackupEnabled", () => {
  test("is disabled in production when the development flag is off", () => {
    expect(
      isEncryptedBackupEnabled({
        isDevelopment: false,
        encryptedBackupInDevelopment: false,
      })
    ).toBe(false);
  });

  test("is disabled in production even when the development flag is on", () => {
    expect(
      isEncryptedBackupEnabled({
        isDevelopment: false,
        encryptedBackupInDevelopment: true,
      })
    ).toBe(false);
  });

  test("is disabled in development when the development flag is off", () => {
    expect(
      isEncryptedBackupEnabled({
        isDevelopment: true,
        encryptedBackupInDevelopment: false,
      })
    ).toBe(false);
  });

  test("is enabled only in development when explicitly enabled", () => {
    expect(
      isEncryptedBackupEnabled({
        isDevelopment: true,
        encryptedBackupInDevelopment: true,
      })
    ).toBe(true);
  });
});
