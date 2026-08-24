import * as SecureStore from "expo-secure-store";
import {
  secureBackupRecoveryKey,
  secureBackupRecoveryKeySecureKey,
  type SecureStoreLike,
} from "@/src/platform/backup/recovery-key";
import { createFakeAsyncStorage as fakeAsyncStorage } from "@/tests/support/async-storage";

function fakeSecureStore(
  initial: Record<string, string> = {},
): SecureStoreLike {
  const store = new Map(Object.entries(initial));
  return {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => {
      store.set(k, v);
    },
    deleteItemAsync: async (k) => {
      store.delete(k);
    },
  };
}

describe("secureBackupRecoveryKey", () => {
  const validPersistedKey = "ab".repeat(32);

  test("generation returns a non-empty key", async () => {
    const secure = fakeSecureStore();
    const recoveryKey = secureBackupRecoveryKey(secure);

    const generated = await recoveryKey.create();

    expect(generated).not.toBe("");
    expect(await recoveryKey.read()).toBe(generated);
  });

  test("independently generated keys differ", async () => {
    const first = secureBackupRecoveryKey(fakeSecureStore());
    const second = secureBackupRecoveryKey(fakeSecureStore());

    const firstKey = await first.create();
    const secondKey = await second.create();

    expect(firstKey).not.toBe(secondKey);
  });

  test("generated key is persisted in SecureStore", async () => {
    const secure = fakeSecureStore();
    const recoveryKey = secureBackupRecoveryKey(secure, async () =>
      new Uint8Array(32).fill(7),
    );

    const generated = await recoveryKey.create();

    expect(await secure.getItemAsync(secureBackupRecoveryKeySecureKey)).toBe(
      generated,
    );
  });

  test("create passes keychainAccessible when persisting the recovery key", async () => {
    const setItemAsync = jest.fn(async () => {});
    const secure: SecureStoreLike = {
      getItemAsync: async () => "07".repeat(32),
      setItemAsync,
      deleteItemAsync: async () => {},
    };

    const recoveryKey = secureBackupRecoveryKey(secure, async () =>
      new Uint8Array(32).fill(7),
    );

    await recoveryKey.create();

    expect(setItemAsync).toHaveBeenCalledWith(
      secureBackupRecoveryKeySecureKey,
      "07".repeat(32),
      expect.objectContaining({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    );
  });

  test("read returns a valid persisted recovery key", async () => {
    const secure = fakeSecureStore({
      [secureBackupRecoveryKeySecureKey]: validPersistedKey,
    });
    const recoveryKey = secureBackupRecoveryKey(secure);

    await expect(recoveryKey.read()).resolves.toBe(validPersistedKey);
  });

  test("read rejects a malformed persisted recovery key", async () => {
    const secure = fakeSecureStore({
      [secureBackupRecoveryKeySecureKey]: "persisted-key",
    });
    const recoveryKey = secureBackupRecoveryKey(secure);

    await expect(recoveryKey.read()).rejects.toThrow();
  });

  test("read rejects a persisted recovery key with the wrong length", async () => {
    const secure = fakeSecureStore({
      [secureBackupRecoveryKeySecureKey]: "ab".repeat(31),
    });
    const recoveryKey = secureBackupRecoveryKey(secure);

    await expect(recoveryKey.read()).rejects.toThrow();
  });

  test("read does not delete a malformed persisted recovery key", async () => {
    const malformed = "persisted-key";
    const secure = fakeSecureStore({
      [secureBackupRecoveryKeySecureKey]: malformed,
    });
    const recoveryKey = secureBackupRecoveryKey(secure);

    await expect(recoveryKey.read()).rejects.toThrow();
    await expect(
      secure.getItemAsync(secureBackupRecoveryKeySecureKey),
    ).resolves.toBe(malformed);
  });

  test("read returns null when absent", async () => {
    const recoveryKey = secureBackupRecoveryKey(fakeSecureStore());

    await expect(recoveryKey.read()).resolves.toBeNull();
  });

  test("create rejects when SecureStore read-back does not match the generated key", async () => {
    const persisted = new Map<string, string>();
    const secure: SecureStoreLike = {
      getItemAsync: async (k) =>
        k === secureBackupRecoveryKeySecureKey
          ? "cd".repeat(32)
          : (persisted.get(k) ?? null),
      setItemAsync: async (k, v) => {
        persisted.set(k, v);
      },
      deleteItemAsync: async (k) => {
        persisted.delete(k);
      },
    };

    const recoveryKey = secureBackupRecoveryKey(secure, async () =>
      new Uint8Array(32).fill(7),
    );

    await expect(recoveryKey.create()).rejects.toThrow();
  });

  test("create rejects when SecureStore read-back is missing", async () => {
    const secure: SecureStoreLike = {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };

    const recoveryKey = secureBackupRecoveryKey(secure, async () =>
      new Uint8Array(32).fill(7),
    );

    await expect(recoveryKey.create()).rejects.toThrow();
  });

  test("delete removes the key", async () => {
    const secure = fakeSecureStore({
      [secureBackupRecoveryKeySecureKey]: validPersistedKey,
    });
    const recoveryKey = secureBackupRecoveryKey(secure);

    await recoveryKey.delete();

    await expect(recoveryKey.read()).resolves.toBeNull();
  });

  test("AsyncStorage never receives the recovery key", async () => {
    const async = fakeAsyncStorage();
    const secure = fakeSecureStore();

    const recoveryKey = secureBackupRecoveryKey(secure, async () =>
      new Uint8Array(32).fill(9),
    );

    const generated = await recoveryKey.create();

    expect(await async.getAllKeys()).toEqual([]);
    expect(await async.getItem(secureBackupRecoveryKeySecureKey)).toBe(null);
    expect(await recoveryKey.read()).toBe(generated);
  });

  test("RNG failure does not persist anything", async () => {
    const secure = fakeSecureStore();

    const recoveryKey = secureBackupRecoveryKey(secure, async () => {
      throw new Error("native RNG unavailable");
    });

    await expect(recoveryKey.create()).rejects.toThrow(
      "native RNG unavailable",
    );
    await expect(recoveryKey.read()).resolves.toBeNull();
  });
});
