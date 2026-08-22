import { Distortion, Model, Thought } from "@/src/model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import _ from "lodash";
import { z } from "zod";

export * from "./home-thought-draft";
export * from "./thought-save-outbox";

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
          .map(([k, t]) => [k, t.data!] as const),
      ),
      thoughtParseErrors: new Map(
        parsed
          .filter(([, t]) => !t.success)
          .map(([k, t]) => [k, t.error!] as const),
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
    thought: Thought.Thought,
  ): Promise<void> {
    if (submissionId !== thought.uuid) {
      throw new Error(
        `persistSubmittedThought: submissionId ${submissionId} does not match thought.uuid ${thought.uuid}`,
      );
    }
    const key = Thought.keyFromId.decode(submissionId);
    let existing: Thought.Thought | null = null;
    try {
      existing = await read(key);
    } catch (error) {
      if (!(
        error instanceof Error &&
        error.message.startsWith("no such thought-id:")
      )) {
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
      `persistSubmittedThought: conflicting record already exists at ${key} for submission ${submissionId}`,
    );
  }
  return {
    readKeys,
    readAll,
    read,
    write,
    remove,
    clear,
    persistSubmittedThought,
  };
}

export type Thought = ReturnType<typeof thoughts>;
