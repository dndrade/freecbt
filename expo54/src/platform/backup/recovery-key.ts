import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(
    key: string,
    value: string,
    options?: {
      keychainAccessible?: number;
    },
  ): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export const secureBackupRecoveryKeySecureKey =
  "freecbt-secure-backup-recovery-key";
const SECURE_BACKUP_RECOVERY_KEY_BYTES = 32;

export type RandomBytes = (byteCount: number) => Promise<Uint8Array>;

function encodeRecoveryKey(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function isValidRecoveryKey(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function secureBackupRecoveryKey(
  secureStorage: SecureStoreLike,
  randomBytes: RandomBytes = Crypto.getRandomBytesAsync,
) {
  async function create(): Promise<string> {
    const bytes = await randomBytes(SECURE_BACKUP_RECOVERY_KEY_BYTES);

    if (bytes.length !== SECURE_BACKUP_RECOVERY_KEY_BYTES) {
      throw new Error("recovery-key generation returned an invalid byte count");
    }

    const recoveryKey = encodeRecoveryKey(bytes);

    await secureStorage.setItemAsync(
      secureBackupRecoveryKeySecureKey,
      recoveryKey,
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );

    const persisted = await secureStorage.getItemAsync(
      secureBackupRecoveryKeySecureKey,
    );

    if (persisted !== recoveryKey) {
      throw new Error("recovery key failed SecureStore read-back verification");
    }

    return recoveryKey;
  }

  async function read(): Promise<string | null> {
    const recoveryKey = await secureStorage.getItemAsync(
      secureBackupRecoveryKeySecureKey,
    );

    if (recoveryKey === null) {
      return null;
    }

    if (!isValidRecoveryKey(recoveryKey)) {
      throw new Error("stored recovery key has an invalid format");
    }

    return recoveryKey;
  }

  async function remove(): Promise<void> {
    await secureStorage.deleteItemAsync(secureBackupRecoveryKeySecureKey);
  }

  return { create, read, delete: remove };
}
export type SecureBackupRecoveryKey = ReturnType<
  typeof secureBackupRecoveryKey
>;
