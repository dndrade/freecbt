import * as LZ from "lz-string";
import { Archive, DistortionData, Thought } from "@/src/model";
import type { SecureBackupRecoveryKey } from "@/src/platform/storage/storage";
import {
  InvalidBackupArchiveError,
  MissingRecoveryKeyError,
  secureBackup,
} from "./secure-backup";

const RECOVERY_KEY = repeatedByteRecoveryKey(0xa1);

function repeatedByteRecoveryKey(byte: number): string {
  return byte.toString(16).padStart(2, "0").repeat(32);
}

const fixtureThought: Thought.Json = {
  uuid: crypto.randomUUID(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  automaticThought: "auto",
  cognitiveDistortions: ["all-or-nothing"],
  challenge: "chal",
  alternativeThought: "alt",
};

function fixtureArchive(): Archive.Archive {
  return Archive.createParsers(DistortionData).fromJson.decode({
    v: "Archive-v1",
    thoughts: [fixtureThought],
  });
}

function fakeRecoveryKeys(initial: string | null = null): {
  storage: SecureBackupRecoveryKey;
  read: jest.Mock<Promise<string | null>, []>;
  create: jest.Mock<Promise<string>, []>;
  remove: jest.Mock<Promise<void>, []>;
} {
  let stored = initial;

  const read = jest.fn(async () => stored);
  const create = jest.fn(async () => {
    stored = RECOVERY_KEY;
    return stored;
  });
  const remove = jest.fn(async () => {
    stored = null;
  });

  return {
    storage: {
      read,
      create,
      delete: remove,
    },
    read,
    create,
    remove,
  };
}

function wrapArchiveJson(value: unknown): string {
  return `:FreeCBT:${LZ.compressToBase64(JSON.stringify(value))}:FreeCBT:`;
}


describe("secureBackup recovery-key lifecycle", () => {
  test("getRecoveryKeyStatus reports missing", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.getRecoveryKeyStatus()).resolves.toBe("missing");

    expect(keys.read).toHaveBeenCalledTimes(1);
    expect(keys.create).not.toHaveBeenCalled();
  });

  test("getRecoveryKeyStatus reports configured", async () => {
    const keys = fakeRecoveryKeys(RECOVERY_KEY);
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.getRecoveryKeyStatus()).resolves.toBe("configured");

    expect(keys.read).toHaveBeenCalledTimes(1);
    expect(keys.create).not.toHaveBeenCalled();
  });

  test("setupRecoveryKey creates a key only when absent", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.setupRecoveryKey()).resolves.toBe(RECOVERY_KEY);
    await expect(backup.setupRecoveryKey()).resolves.toBe(RECOVERY_KEY);

    expect(keys.create).toHaveBeenCalledTimes(1);
  });

  test("setupRecoveryKey does not replace an existing key", async () => {
    const keys = fakeRecoveryKeys(RECOVERY_KEY);
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.setupRecoveryKey()).resolves.toBe(RECOVERY_KEY);

    expect(keys.create).not.toHaveBeenCalled();
    expect(keys.remove).not.toHaveBeenCalled();
  });

  test("revealRecoveryKey returns the stored key", async () => {
    const keys = fakeRecoveryKeys(RECOVERY_KEY);
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.revealRecoveryKey()).resolves.toBe(RECOVERY_KEY);

    expect(keys.create).not.toHaveBeenCalled();
  });

  test("revealRecoveryKey fails when the key is missing", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.revealRecoveryKey()).rejects.toBeInstanceOf(
        MissingRecoveryKeyError
    );

    expect(keys.create).not.toHaveBeenCalled();
  });
});

describe("secureBackup exportArchiveV3", () => {
  test("reuses an existing recovery key", async () => {
    const keys = fakeRecoveryKeys(RECOVERY_KEY);
    const backup = secureBackup(DistortionData, keys.storage);

    const exported = await backup.exportArchiveV3(fixtureArchive());

    expect(keys.create).not.toHaveBeenCalled();

    const decoded = Archive.createParsers(DistortionData).decodeFile(exported);
    expect(decoded.kind).toBe("encrypted");

    if (decoded.kind === "encrypted") {
      await expect(decoded.decrypt(RECOVERY_KEY)).resolves.toEqual(
          fixtureArchive()
      );
    }
  });

  test("creates and persists a recovery key when absent", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    const exported = await backup.exportArchiveV3(fixtureArchive());

    expect(keys.create).toHaveBeenCalledTimes(1);

    const decoded = Archive.createParsers(DistortionData).decodeFile(exported);
    expect(decoded.kind).toBe("encrypted");

    if (decoded.kind === "encrypted") {
      await expect(decoded.decrypt(RECOVERY_KEY)).resolves.toEqual(
          fixtureArchive()
      );
    }
  });

  test("concurrent exports share one recovery-key creation", async () => {
    let stored: string | null = null;
    let resolveCreate!: (value: string) => void;

    const createPromise = new Promise<string>((resolve) => {
      resolveCreate = resolve;
    });

    const read = jest.fn(async () => stored);
    const create = jest.fn(async () => {
      const generated = await createPromise;
      stored = generated;
      return generated;
    });

    const keys: SecureBackupRecoveryKey = {
      read,
      create,
      delete: jest.fn(async () => {
        stored = null;
      }),
    };

    const backup = secureBackup(DistortionData, keys);
    const archive = fixtureArchive();

    const first = backup.exportArchiveV3(archive);
    const second = backup.exportArchiveV3(archive);

    await Promise.resolve();
    resolveCreate(RECOVERY_KEY);

    const [firstExport, secondExport] = await Promise.all([first, second]);

    expect(create).toHaveBeenCalledTimes(1);

    const parser = Archive.createParsers(DistortionData);

    for (const exported of [firstExport, secondExport]) {
      const decoded = parser.decodeFile(exported);
      expect(decoded.kind).toBe("encrypted");

      if (decoded.kind === "encrypted") {
        await expect(decoded.decrypt(RECOVERY_KEY)).resolves.toEqual(archive);
      }
    }
  });
});

describe("secureBackup restoreArchive", () => {
  test("restores Archive-v3 with the stored recovery key", async () => {
    const parser = Archive.createParsers(DistortionData);
    const encrypted = await parser.encodeEncrypted(
        fixtureArchive(),
        RECOVERY_KEY
    );
    const keys = fakeRecoveryKeys(RECOVERY_KEY);
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.restoreArchive(encrypted)).resolves.toEqual(
        fixtureArchive()
    );

    expect(keys.create).not.toHaveBeenCalled();
  });

  test("fails clearly when Archive-v3 has no stored recovery key", async () => {
    const parser = Archive.createParsers(DistortionData);
    const encrypted = await parser.encodeEncrypted(
        fixtureArchive(),
        RECOVERY_KEY
    );
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.restoreArchive(encrypted)).rejects.toBeInstanceOf(
        MissingRecoveryKeyError
    );

    expect(keys.create).not.toHaveBeenCalled();
  });

  test("Archive-v1 restore does not access recovery-key storage", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);
    const encoded = wrapArchiveJson({
      v: "Archive-v1",
      thoughts: [fixtureThought],
    });

    await expect(backup.restoreArchive(encoded)).resolves.toEqual(
        fixtureArchive()
    );

    expect(keys.read).not.toHaveBeenCalled();
    expect(keys.create).not.toHaveBeenCalled();
    expect(keys.remove).not.toHaveBeenCalled();
  });

  test("Archive-v2 restore does not access recovery-key storage", async () => {
    const parser = Archive.createParsers(DistortionData);
    const encoded = parser.fromString.encode(fixtureArchive());
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(backup.restoreArchive(encoded)).resolves.toEqual(
        fixtureArchive()
    );

    expect(keys.read).not.toHaveBeenCalled();
    expect(keys.create).not.toHaveBeenCalled();
    expect(keys.remove).not.toHaveBeenCalled();
  });

  test("invalid archives fail without creating a recovery key", async () => {
    const keys = fakeRecoveryKeys();
    const backup = secureBackup(DistortionData, keys.storage);

    await expect(
        backup.restoreArchive("not a FreeCBT archive")
    ).rejects.toBeInstanceOf(InvalidBackupArchiveError);

    expect(keys.read).not.toHaveBeenCalled();
    expect(keys.create).not.toHaveBeenCalled();
    expect(keys.remove).not.toHaveBeenCalled();
  });
});
