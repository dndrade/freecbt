import { Archive, Distortion } from "@/src/model";
import type { SecureBackupRecoveryKey } from "@/src/platform/storage/storage";

export class MissingRecoveryKeyError extends Error {
  constructor() {
    super("secure backup recovery key is unavailable");
    this.name = "MissingRecoveryKeyError";
    Object.setPrototypeOf(this, MissingRecoveryKeyError.prototype);
  }
}

export class InvalidBackupArchiveError extends Error {
  constructor(reason: string) {
    super(`invalid backup archive: ${reason}`);
    this.name = "InvalidBackupArchiveError";
    Object.setPrototypeOf(this, InvalidBackupArchiveError.prototype);
  }
}

export function secureBackup(
    distortionData: Distortion.Data,
    recoveryKeys: SecureBackupRecoveryKey
) {
  const archive = Archive.createParsers(distortionData);
  let pendingRecoveryKey: Promise<string> | null = null;

  async function readOrCreateRecoveryKey(): Promise<string> {
    const existing = await recoveryKeys.read();

    if (existing !== null) {
      return existing;
    }

    if (pendingRecoveryKey === null) {
      pendingRecoveryKey = (async () => {
        const rechecked = await recoveryKeys.read();

        if (rechecked !== null) {
          return rechecked;
        }

        return await recoveryKeys.create();
      })();
    }

    const current = pendingRecoveryKey;

    try {
      return await current;
    } finally {
      if (pendingRecoveryKey === current) {
        pendingRecoveryKey = null;
      }
    }
  }

  async function getRecoveryKeyStatus(): Promise<
      "missing" | "configured"
  > {
    return (await recoveryKeys.read()) === null ? "missing" : "configured";
  }

  async function setupRecoveryKey(): Promise<string> {
    return await readOrCreateRecoveryKey();
  }

  async function revealRecoveryKey(): Promise<string> {
    const recoveryKey = await recoveryKeys.read();

    if (recoveryKey === null) {
      throw new MissingRecoveryKeyError();
    }

    return recoveryKey;
  }

  async function exportArchiveV3(
      value: Archive.Archive
  ): Promise<string> {
    const recoveryKey = await setupRecoveryKey();
    return await archive.encodeEncrypted(value, recoveryKey);
  }

  async function restoreArchive(text: string): Promise<Archive.Archive> {
    const decoded = archive.decodeFile(text);

    if (decoded.kind === "invalid") {
      throw new InvalidBackupArchiveError(decoded.reason);
    }

    if (decoded.kind === "legacy") {
      return decoded.archive;
    }

    const recoveryKey = await recoveryKeys.read();

    if (recoveryKey === null) {
      throw new MissingRecoveryKeyError();
    }

    return await decoded.decrypt(recoveryKey);
  }

  return {
    getRecoveryKeyStatus,
    setupRecoveryKey,
    revealRecoveryKey,
    exportArchiveV3,
    restoreArchive,
  };
}

export type SecureBackup = ReturnType<typeof secureBackup>;
