import * as SecureStore from "expo-secure-store";
import { DistortionData } from "@/src/model";
import {
    createExpoBackupFileSystem,
    ensureDefaultBackupDirectory,
} from "./backup-file-system";
import { secureBackup } from "./secure-backup";
import { createSecureBackup } from "./secure-backup-runtime";
import { secureBackupRecoveryKey } from "../storage/storage";

jest.mock("expo-secure-store", () => ({}));

jest.mock("./backup-file-system", () => ({
    createExpoBackupFileSystem: jest.fn(),
    ensureDefaultBackupDirectory: jest.fn(),
}));

jest.mock("./secure-backup", () => ({
    secureBackup: jest.fn(),
}));

jest.mock("../storage/storage", () => ({
    secureBackupRecoveryKey: jest.fn(),
}));

describe("createSecureBackup", () => {
    test("composes the repository with recovery-key and default destination adapters", async () => {
        const recoveryKeys = {
            read: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        };
        const defaultDirectory = {
            uri: "file:///documents/FreeCBT-backups",
            exists: true,
        };
        const fileSystem = {
            join: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            read: jest.fn(),
            write: jest.fn(),
            delete: jest.fn(),
        };
        const repository = {
            getRecoveryKeyStatus: jest.fn(),
            setupRecoveryKey: jest.fn(),
            revealRecoveryKey: jest.fn(),
            exportArchiveV3: jest.fn(),
            restoreArchive: jest.fn(),
            createBackup: jest.fn(),
            restoreBackupFile: jest.fn(),
        };

        jest
            .mocked(secureBackupRecoveryKey)
            .mockReturnValue(recoveryKeys as never);
        jest
            .mocked(ensureDefaultBackupDirectory)
            .mockReturnValue(defaultDirectory as never);
        jest
            .mocked(createExpoBackupFileSystem)
            .mockReturnValue(fileSystem);
        jest.mocked(secureBackup).mockReturnValue(repository as never);

        expect(createSecureBackup(DistortionData)).toBe(repository);

        expect(secureBackupRecoveryKey).toHaveBeenCalledWith(SecureStore);
        expect(ensureDefaultBackupDirectory).toHaveBeenCalledTimes(1);
        expect(createExpoBackupFileSystem).toHaveBeenCalledTimes(1);
        expect(secureBackup).toHaveBeenCalledWith(
            DistortionData,
            recoveryKeys,
            expect.objectContaining({
                defaultDirectoryUri:
                    "file:///documents/FreeCBT-backups",
                fileSystem,
            })
        );

        const destination = jest.mocked(secureBackup).mock.calls[0][2];

        await expect(
            destination?.getConfiguredDirectoryUri()
        ).resolves.toBeNull();
        await expect(
            destination?.isAccessible(
                "file:///documents/FreeCBT-backups"
            )
        ).resolves.toBe(true);
        await expect(
            destination?.isAccessible("file:///other")
        ).resolves.toBe(false);
        expect(destination?.now()).toBeInstanceOf(Date);
    });
});