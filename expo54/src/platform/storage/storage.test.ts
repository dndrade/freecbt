import { Storage } from "../..";
import { Archive, DistortionData, Settings, Thought } from "../../model";
import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { z } from "zod";
import * as SecureStore from "expo-secure-store";

function fakeAsyncStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    return {
        getItem: async (k: string) => store.get(k) ?? null,
        setItem: async (k: string, v: string) => {
            store.set(k, v);
        },
        removeItem: async (k: string) => {
            store.delete(k);
        },
        multiGet: async (ks: readonly string[]) =>
            ks.map((k) => [k, store.get(k) ?? null] as const),
        multiSet: async (pairs: readonly [string, string][]) => {
            for (const [k, v] of pairs) store.set(k, v);
        },
        multiRemove: async (ks: readonly string[]) => {
            for (const k of ks) store.delete(k);
        },
        getAllKeys: async () => Array.from(store.keys()),
    } as unknown as AsyncStorageStatic;
}

function fakeSecureStore(
    initial: Record<string, string> = {}
): Storage.SecureStoreLike {
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
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        const generated = await recoveryKey.create();

        expect(generated).not.toBe("");
        expect(await recoveryKey.read()).toBe(generated);
    });

    test("independently generated keys differ", async () => {
        const first = Storage.secureBackupRecoveryKey(fakeSecureStore());
        const second = Storage.secureBackupRecoveryKey(fakeSecureStore());

        const firstKey = await first.create();
        const secondKey = await second.create();

        expect(firstKey).not.toBe(secondKey);
    });

    test("generated key is persisted in SecureStore", async () => {
        const secure = fakeSecureStore();
        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => new Uint8Array(32).fill(7)
        );

        const generated = await recoveryKey.create();

        expect(
            await secure.getItemAsync(Storage.secureBackupRecoveryKeySecureKey)
        ).toBe(generated);
    });

    test("create passes keychainAccessible when persisting the recovery key", async () => {
        const setItemAsync = jest.fn(async () => {});
        const secure: Storage.SecureStoreLike = {
            getItemAsync: async () => "07".repeat(32),
            setItemAsync,
            deleteItemAsync: async () => {},
        };

        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => new Uint8Array(32).fill(7)
        );

        await recoveryKey.create();

        expect(setItemAsync).toHaveBeenCalledWith(
            Storage.secureBackupRecoveryKeySecureKey,
            "07".repeat(32),
            expect.objectContaining({
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            })
        );
    });

    test("read returns a valid persisted recovery key", async () => {
        const secure = fakeSecureStore({
            [Storage.secureBackupRecoveryKeySecureKey]: validPersistedKey,
        });
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        await expect(recoveryKey.read()).resolves.toBe(validPersistedKey);
    });

    test("read rejects a malformed persisted recovery key", async () => {
        const secure = fakeSecureStore({
            [Storage.secureBackupRecoveryKeySecureKey]: "persisted-key",
        });
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        await expect(recoveryKey.read()).rejects.toThrow();
    });

    test("read rejects a persisted recovery key with the wrong length", async () => {
        const secure = fakeSecureStore({
            [Storage.secureBackupRecoveryKeySecureKey]: "ab".repeat(31),
        });
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        await expect(recoveryKey.read()).rejects.toThrow();
    });

    test("read does not delete a malformed persisted recovery key", async () => {
        const malformed = "persisted-key";
        const secure = fakeSecureStore({
            [Storage.secureBackupRecoveryKeySecureKey]: malformed,
        });
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        await expect(recoveryKey.read()).rejects.toThrow();
        await expect(
            secure.getItemAsync(Storage.secureBackupRecoveryKeySecureKey)
        ).resolves.toBe(malformed);
    });

    test("read returns null when absent", async () => {
        const recoveryKey = Storage.secureBackupRecoveryKey(fakeSecureStore());

        await expect(recoveryKey.read()).resolves.toBeNull();
    });

    test("create rejects when SecureStore read-back does not match the generated key", async () => {
        const persisted = new Map<string, string>();
        const secure: Storage.SecureStoreLike = {
            getItemAsync: async (k) =>
                k === Storage.secureBackupRecoveryKeySecureKey
                    ? "cd".repeat(32)
                    : persisted.get(k) ?? null,
            setItemAsync: async (k, v) => {
                persisted.set(k, v);
            },
            deleteItemAsync: async (k) => {
                persisted.delete(k);
            },
        };

        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => new Uint8Array(32).fill(7)
        );

        await expect(recoveryKey.create()).rejects.toThrow();
    });

    test("create rejects when SecureStore read-back is missing", async () => {
        const secure: Storage.SecureStoreLike = {
            getItemAsync: async () => null,
            setItemAsync: async () => {},
            deleteItemAsync: async () => {},
        };

        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => new Uint8Array(32).fill(7)
        );

        await expect(recoveryKey.create()).rejects.toThrow();
    });

    test("delete removes the key", async () => {
        const secure = fakeSecureStore({
            [Storage.secureBackupRecoveryKeySecureKey]: validPersistedKey,
        });
        const recoveryKey = Storage.secureBackupRecoveryKey(secure);

        await recoveryKey.delete();

        await expect(recoveryKey.read()).resolves.toBeNull();
    });

    test("AsyncStorage never receives the recovery key", async () => {
        const async = fakeAsyncStorage();
        const secure = fakeSecureStore();

        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => new Uint8Array(32).fill(9)
        );

        const generated = await recoveryKey.create();

        expect(await async.getAllKeys()).toEqual([]);
        expect(
            await async.getItem(Storage.secureBackupRecoveryKeySecureKey)
        ).toBe(null);
        expect(await recoveryKey.read()).toBe(generated);
    });

    test("RNG failure does not persist anything", async () => {
        const secure = fakeSecureStore();

        const recoveryKey = Storage.secureBackupRecoveryKey(
            secure,
            async () => {
                throw new Error("native RNG unavailable");
            }
        );

        await expect(recoveryKey.create()).rejects.toThrow(
            "native RNG unavailable"
        );
        await expect(recoveryKey.read()).resolves.toBeNull();
    });
});

test("read: fresh install has no pincode in either store", async () => {
    const async = fakeAsyncStorage();
    const secure = fakeSecureStore();
    const s = Storage.settings(async, secure);
    const result = await s.read();
    expect(result.pincode).toBe(null);
});

test("read: migrates a legacy plaintext pincode from AsyncStorage to SecureStore", async () => {
    const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
    const secure = fakeSecureStore();
    const s = Storage.settings(async, secure);
    const result = await s.read();
    expect(result.pincode).toBe("1234");
    expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("1234");
    expect(await async.getItem(Settings.pincodeKey)).toBe(null);
});

test("read: a failing SecureStore write during migration leaves the legacy pincode untouched and still returns it", async () => {
    const async = fakeAsyncStorage({ [Settings.pincodeKey]: "1234" });
    const secure: Storage.SecureStoreLike = {
        getItemAsync: async () => null,
        setItemAsync: async () => {
            throw new Error("secure store unavailable");
        },
        deleteItemAsync: async () => {},
    };
    const s = Storage.settings(async, secure);
    const result = await s.read();
    expect(result.pincode).toBe("1234");
    expect(await async.getItem(Settings.pincodeKey)).toBe("1234");
});

test("read: uses the SecureStore value when present, ignoring AsyncStorage", async () => {
    const async = fakeAsyncStorage({ [Settings.pincodeKey]: "0000" });
    const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "5678" });
    const s = Storage.settings(async, secure);
    const result = await s.read();
    expect(result.pincode).toBe("5678");
});

test("write: routes pincode through SecureStore, other settings through AsyncStorage", async () => {
    const async = fakeAsyncStorage();
    const secure = fakeSecureStore();
    const setItemAsync = jest.spyOn(secure, "setItemAsync");

    const s = Storage.settings(async, secure);

    await s.write({ ...Settings.empty(), pincode: "4321", theme: "dark" });

    expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe("4321");
    expect(await async.getItem(Settings.pincodeKey)).toBe(null);
    expect(await async.getItem(Settings.themeKey)).toBe("dark");

    expect(setItemAsync).toHaveBeenCalledWith(
        Settings.pincodeSecureKey,
        "4321"
    );
});

test("write: a null pincode deletes it from SecureStore", async () => {
    const async = fakeAsyncStorage();
    const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "9999" });
    const s = Storage.settings(async, secure);
    await s.write(Settings.empty());
    expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
});

test("clear: removes the pincode from SecureStore and other keys from AsyncStorage", async () => {
    const async = fakeAsyncStorage({ [Settings.themeKey]: "dark" });
    const secure = fakeSecureStore({ [Settings.pincodeSecureKey]: "1111" });
    const s = Storage.settings(async, secure);
    await s.clear();
    expect(await secure.getItemAsync(Settings.pincodeSecureKey)).toBe(null);
    expect(await async.getItem(Settings.themeKey)).toBe(null);
});

test("readAll: a malformed thought does not delete either record", async () => {
    const validUuid = "11111111-1111-1111-1111-111111111111";
    const validKey = `${Thought.KEY_PREFIX}${validUuid}`;
    const malformedKey = `${Thought.KEY_PREFIX}22222222-2222-2222-2222-222222222222`;
    const validThoughtJson = {
        v: "Thought-v1",
        automaticThought: "auto",
        alternativeThought: "alt",
        cognitiveDistortions: ["all-or-nothing"],
        challenge: "chal",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        uuid: validUuid,
    };
    const async = fakeAsyncStorage({
        [validKey]: JSON.stringify(validThoughtJson),
        [malformedKey]: "not valid json {",
    });
    const T = Storage.thoughts(DistortionData, async);

    const result = await T.readAll();

    expect(result.thoughts.size).toBe(1);
    expect(result.thoughtParseErrors.size).toBe(1);
    expect(result.thoughts.has(validKey as Thought.Key)).toBe(true);
    expect(result.thoughtParseErrors.has(malformedKey as Thought.Key)).toBe(true);
    expect(
        result.thoughtParseErrors.get(malformedKey as Thought.Key)
    ).toBeInstanceOf(z.ZodError);
    expect(await async.getItem(validKey)).not.toBe(null);
    expect(await async.getItem(malformedKey)).not.toBe(null);
});

describe("thoughts: persistSubmittedThought", () => {
    function sampleThought(overrides: Partial<Thought.Spec> = {}, now = new Date(0)): Thought.Thought {
        return Thought.create(
            { ...Thought.emptySpec(), automaticThought: "original", ...overrides },
            now
        );
    }

    test("first write persists the submitted thought at its stable key", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const thought = sampleThought();

        await T.persistSubmittedThought(thought.uuid, thought);

        expect(await T.readKeys()).toEqual([Thought.key(thought)]);
        expect(await T.read(Thought.key(thought))).toEqual(thought);
    });

    test("exact replay of the same submission id and content is an idempotent no-op", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const thought = sampleThought();

        await T.persistSubmittedThought(thought.uuid, thought);
        await expect(
            T.persistSubmittedThought(thought.uuid, thought)
        ).resolves.toBeUndefined();

        expect(await T.readKeys()).toEqual([Thought.key(thought)]);
        expect(await T.read(Thought.key(thought))).toEqual(thought);
    });

    test("an existing record with matching content is treated as already persisted", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const thought = sampleThought();
        // written directly, bypassing persistSubmittedThought, to simulate an interrupted
        // replay where the record already landed before the crash/restart
        await T.write(thought);

        await expect(
            T.persistSubmittedThought(thought.uuid, thought)
        ).resolves.toBeUndefined();

        expect(await T.readKeys()).toEqual([Thought.key(thought)]);
        expect(await T.read(Thought.key(thought))).toEqual(thought);
    });

    test("a conflicting record at the same key is an explicit failure, never overwritten", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const original = sampleThought({ automaticThought: "original content" });
        await T.write(original);
        const conflicting: Thought.Thought = {
            ...original,
            automaticThought: "different content",
        };

        await expect(
            T.persistSubmittedThought(conflicting.uuid, conflicting)
        ).rejects.toThrow();

        expect(await T.readKeys()).toEqual([Thought.key(original)]);
        expect(await T.read(Thought.key(original))).toEqual(original);
    });

    test("submissionId must match thought.uuid", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const thought = sampleThought();
        const otherId = Thought.Id.decode("11111111-1111-1111-1111-111111111111");

        await expect(
            T.persistSubmittedThought(otherId, thought)
        ).rejects.toThrow();

        expect(await T.readKeys()).toEqual([]);
    });

    test("cleanup-failed replay: retried outbox removal does not duplicate or rewrite the persisted thought", async () => {
        const async = fakeAsyncStorage();
        const T = Storage.thoughts(DistortionData, async);
        const outbox = Storage.thoughtSaveOutbox(DistortionData, async);
        const thought = sampleThought({ automaticThought: "cleanup-failed thought" });
        const submissionId = thought.uuid;

        const active: Storage.ThoughtSaveOutboxRecord = {
            submissionId,
            thought,
            sourceDraftRevision: 0,
            attemptCount: 1,
            lastAttemptAt: new Date(0),
            lastError: null,
            retryRequested: false,
            thoughtPersisted: false,
            updatedAt: new Date(0),
            status: "active",
        };
        await outbox.insert(active);

        // the "write-submitted-thought" cmd handler succeeds: the thought is durably saved
        await T.persistSubmittedThought(submissionId, thought);

        // outbox removal then fails, leaving a cleanup-failed record (thoughtPersisted stays true)
        const cleanupFailed: Storage.ThoughtSaveOutboxRecord = {
            ...active,
            status: "cleanup-failed",
            thoughtPersisted: true,
            attemptCount: 2,
        };
        await outbox.update(cleanupFailed);

        // an explicit retry reconciles against the same key: replaying persistSubmittedThought
        // with the original immutable snapshot must stay a no-op, never a duplicate or a new uuid
        await expect(
            T.persistSubmittedThought(submissionId, thought)
        ).resolves.toBeUndefined();
        expect(await T.readKeys()).toEqual([Thought.key(thought)]);
        expect(await T.read(Thought.key(thought))).toEqual(thought);

        // and outbox removal, retried on its own, can now complete cleanup
        await outbox.remove(submissionId);
        expect(await outbox.readAll()).toEqual([]);
    });
});

test("readAll: restores every thought from a decoded historical archive", async () => {
    // Same real historical-format snapshot already used in
    // model/archive/thoughts-archive.test.ts's "parse nonempty json snapshot from old version".
    const snapshot =
        ":FreeCBT:N4IgbiBcIIIE4GMAWBLMBTAtGAjCANCAC5ID2ArgOZJEDOUA2qAIblGkC2zRKCAKmSo0oIVuwIhkzADbT0AO0roRU6RJlF0cedzToBFakREaJCUpXkoeGACIpa7OD1Lz6kBqNmZScTPNISFEUQAF1CBDh0bnQAExhjaBwATgB2AAZMdJwsnD509MgCopwAOgAmAGYAFgAtCXIAB1iY+MSQFIzc3PzC4uyKmvrCcnIUWJFaTnRR8YkIaAMhImw8AF9QtaA===:FreeCBT:";
    const A = Archive.createParsers(DistortionData);
    const arc = A.fromString.decode(snapshot);
    expect(arc.thoughts).toHaveLength(1);

    const async = fakeAsyncStorage();
    const T = Storage.thoughts(DistortionData, async);
    for (const t of arc.thoughts) {
        await T.write(t);
    }

    const result = await T.readAll();
    expect(result.thoughts.size).toBe(arc.thoughts.length);
    expect(result.thoughtParseErrors.size).toBe(0);
    const [restored] = Array.from(result.thoughts.values());
    expect(restored.automaticThought).toBe("auto");
    expect(restored.challenge).toBe("chal");
    expect(restored.alternativeThought).toBe("alt");
    expect(restored.uuid).toBe("someuuid");
});
