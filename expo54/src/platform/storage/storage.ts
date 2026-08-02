import { Distortion, Model, Settings, Thought } from "@/src/model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { z } from "zod";

export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

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
  return { readKeys, readAll, read, write, remove, clear };
}

export type Thought = ReturnType<typeof thoughts>;
