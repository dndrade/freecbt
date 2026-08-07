import * as SecureStore from "expo-secure-store";
import { DistortionData } from "@/src/model";
import { secureBackup } from "./secure-backup";
import { createSecureBackup } from "./secure-backup-runtime";
import { secureBackupRecoveryKey } from "../storage/storage";

jest.mock("expo-secure-store", () => ({}));

jest.mock("./secure-backup", () => ({
  secureBackup: jest.fn(),
}));

jest.mock("../storage/storage", () => ({
  secureBackupRecoveryKey: jest.fn(),
}));

describe("createSecureBackup", () => {
  test("composes the repository with SecureStore recovery-key storage", () => {
    const recoveryKeys = {
      read: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    const repository = {
      getRecoveryKeyStatus: jest.fn(),
      setupRecoveryKey: jest.fn(),
      revealRecoveryKey: jest.fn(),
      exportArchiveV3: jest.fn(),
      restoreArchive: jest.fn(),
    };

    jest
      .mocked(secureBackupRecoveryKey)
      .mockReturnValue(recoveryKeys as never);
    jest.mocked(secureBackup).mockReturnValue(repository as never);

    expect(createSecureBackup(DistortionData)).toBe(repository);

    expect(secureBackupRecoveryKey).toHaveBeenCalledWith(SecureStore);
    expect(secureBackup).toHaveBeenCalledWith(
      DistortionData,
      recoveryKeys
    );
  });
});
