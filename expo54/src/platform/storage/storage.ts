import { Distortion, Model, Settings, Thought } from "@/src/model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import _ from "lodash";
import { z } from "zod";

export * from "./home-thought-draft";
export * from "./thought-save-outbox";

export interface SecureStoreLike {
    getItemAsync(key: string): Promise<string | null>;
    setItemAsync(
        key: string,
        value: string,
        options?: {
            keychainAccessible?: number;
        }
    ): Promise<void>;
    deleteItemAsync(key: string): Promise<void>;
}

export const secureBackupRecoveryKeySecureKey =
    "freecbt-secure-backup-recovery-key";
const SECURE_BACKUP_RECOVERY_KEY_BYTES = 32;

export type RandomBytes = (byteCount: number) => Promise<Uint8Array>;

function encodeRecoveryKey(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
  );
}

function isValidRecoveryKey(value: string): boolean {
    return /^[0-9a-f]{64}$/.test(value);
}

export function secureBackupRecoveryKey(
    secureStorage: SecureStoreLike,
    randomBytes: RandomBytes = Crypto.getRandomBytesAsync
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
            }
        );

        const persisted = await secureStorage.getItemAsync(
            secureBackupRecoveryKeySecureKey
        );

        if (persisted !== recoveryKey) {
            throw new Error(
                "recovery key failed SecureStore read-back verification"
            );
        }

        return recoveryKey;
    }

    async function read(): Promise<string | null> {
          const recoveryKey = await secureStorage.getItemAsync(
                secureBackupRecoveryKeySecureKey
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

export function settings(
  storage: AsyncStorageStatic,
  secureStorage: SecureStoreLike
) {
  // Existing users may still have their pincode in AsyncStorage from
  // before this file started using SecureStore. Migrate it once, on the
  // first read after upgrading, then never touch the legacy key again.
  async function readPincode(): Promise<string | null> {
    const secure = await secureStorage.getItemAsync(Settings.pincodeSecureKey);
    if (secure !== null) return secure;
    const legacy = await storage.getItem(Settings.pincodeKey);
    if (legacy !== null) {
      try {
        await secureStorage.setItemAsync(Settings.pincodeSecureKey, legacy);
        await storage.removeItem(Settings.pincodeKey);
      } catch {
        // secure write failed — leave the legacy key in place so migration can retry later
      }
    }
    return legacy;
  }
  async function read(): Promise<Settings.Settings> {
    const [batch, pincode] = await Promise.all([
      storage.multiGet(Settings.batchKeys),
      readPincode(),
    ]);
    const json = {
      ...Object.fromEntries(batch),
      [Settings.pincodeKey]: pincode,
    };
    return Settings.fromJson.parse(json);
  }
  async function write(s: Settings.Settings): Promise<void> {
    const json = Settings.fromJson.encode(s);
    const { [Settings.pincodeKey]: pincode, ...rest } = json;
    const entries = Object.entries(rest);
    const removes = entries.filter(([, v]) => v === null).map(([k]) => k);
    const sets = entries.filter((p): p is [string, string] => p[1] !== null);
    await Promise.all([
      storage.multiRemove(removes),
      storage.multiSet(sets),
      pincode === null
        ? secureStorage.deleteItemAsync(Settings.pincodeSecureKey)
        : secureStorage.setItemAsync(Settings.pincodeSecureKey, pincode),
    ]);
  }
  async function clear() {
    await Promise.all([
      storage.multiRemove(Settings.keys),
      secureStorage.deleteItemAsync(Settings.pincodeSecureKey),
    ]);
  }
  return { read, write, clear };
}
export type Settings = ReturnType<typeof settings>;

export function thoughts(data: Distortion.Data, storage: AsyncStorageStatic) {
  const T = Thought.createParsers(data);

  async function readKeys(): Promise<readonly Thought.Key[]> {
    const keys = await storage.getAllKeys();
    return keys
      .map((k) => Thought.Key.safeDecode(k))
      .filter((k) => k.success)
      .map((k) => k.data);
  }
  async function readAll(): Promise<
    Pick<Model.Ready, "thoughts" | "thoughtParseErrors">
  > {
    const keys = await readKeys();
    const pairs = await storage.multiGet(keys);
    type ParseResult = ReturnType<typeof T.fromString.safeParse>;
    const parsed = pairs.map(([k, enc]) => {
      let result: ParseResult;
      try {
        result = T.fromString.safeParse(enc);
      } catch (err) {
        // any throw from inside the codec's decode function (malformed JSON, unknown distortion slug, …) —
        // reported as a parse error rather than crashing the whole read
        result = {
          success: false,
          error: new z.ZodError([
            {
              code: "custom",
              message: err instanceof Error ? err.message : "Invalid JSON",
              path: [],
            },
          ]),
        } as ParseResult;
      }
      return [Thought.Key.decode(k), result] as const;
    });
    return {
      thoughts: new Map(
        parsed
          .filter(([, t]) => t.success)
          .map(([k, t]) => [k, t.data!] as const)
      ),
      thoughtParseErrors: new Map(
        parsed
          .filter(([, t]) => !t.success)
          .map(([k, t]) => [k, t.error!] as const)
      ),
    };
  }
  async function write(t: Thought.Thought): Promise<void> {
    const enc = T.fromString.encode(t);
    const key = Thought.key(t);
    return await storage.setItem(key, enc);
  }
  async function read(id: Thought.Key): Promise<Thought.Thought> {
    const enc = await storage.getItem(id);
    if (enc === null) throw new Error(`no such thought-id: ${id}`);
    return T.fromString.decode(enc);
  }
  async function remove(id: Thought.Key): Promise<void> {
    await storage.removeItem(id);
  }
  async function clear() {
    const keys = await readKeys();
    await storage.multiRemove(keys);
  }
  // Idempotent, stable-ID persistence for a submitted thought. Replaying the same
  // submission always targets the same storage identity: an exact-matching existing
  // record is treated as "already persisted" (no-op success); a conflicting record at
  // that key (same id, different content) is an explicit failure, never overwritten.
  async function persistSubmittedThought(
    submissionId: Thought.Id,
    thought: Thought.Thought
  ): Promise<void> {
    if (submissionId !== thought.uuid) {
      throw new Error(
        `persistSubmittedThought: submissionId ${submissionId} does not match thought.uuid ${thought.uuid}`
      );
    }
    const key = Thought.keyFromId.decode(submissionId);
    let existing: Thought.Thought | null = null;
    try {
      existing = await read(key);
    } catch (error) {
      if (
        !(error instanceof Error && error.message.startsWith("no such thought-id:"))
      ) {
        throw error;
      }
    }
    if (existing === null) {
      await write(thought);
      return;
    }
    if (_.isEqual(existing, thought)) {
      return; // already persisted at this key — idempotent no-op
    }
    throw new Error(
      `persistSubmittedThought: conflicting record already exists at ${key} for submission ${submissionId}`
    );
  }
  return { readKeys, readAll, read, write, remove, clear, persistSubmittedThought };
}

export type Thought = ReturnType<typeof thoughts>;
