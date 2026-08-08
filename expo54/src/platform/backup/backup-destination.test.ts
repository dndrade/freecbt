import {
    BACKUP_FILENAME_PREFIX,
    BackupDestinationUnavailableError,
    BackupFileAlreadyExistsError,
    BackupWriteVerificationError,
    type BackupFileSystem,
    createBackupFilename,
    resolveBackupDestination,
    writeBackupFile,
} from "./backup-destination";

describe("createBackupFilename", () => {
    test("creates a deterministic timestamped filename", () => {
        const date = new Date("2026-08-07T03:00:00.000Z");

        expect(createBackupFilename(date)).toBe(
            "FreeCBT-backup-2026-08-07T03-00-00-000Z"
        );
    });

    test("uses the documented backup filename prefix", () => {
        const filename = createBackupFilename(
            new Date("2026-01-02T03:04:05.006Z")
        );

        expect(filename.startsWith(`${BACKUP_FILENAME_PREFIX}-`)).toBe(true);
    });

    test("contains no colon or period characters", () => {
        const filename = createBackupFilename(
            new Date("2026-08-07T03:00:00.000Z")
        );

        expect(filename).not.toMatch(/[:.]/);
    });

    test("different timestamps produce different filenames", () => {
        const first = createBackupFilename(
            new Date("2026-08-07T03:00:00.000Z")
        );
        const second = createBackupFilename(
            new Date("2026-08-07T03:00:00.001Z")
        );

        expect(first).not.toBe(second);
    });
});

describe("resolveBackupDestination", () => {
    test("uses the configured destination when accessible", async () => {
        const isAccessible = jest.fn(async () => true);

        await expect(
            resolveBackupDestination({
                configuredDirectoryUri: "content://configured",
                defaultDirectoryUri: "file:///default",
                isAccessible,
            })
        ).resolves.toEqual({
            directoryUri: "content://configured",
            source: "configured",
        });

        expect(isAccessible).toHaveBeenCalledTimes(1);
        expect(isAccessible).toHaveBeenCalledWith(
            "content://configured"
        );
    });

    test("uses the default destination when none is configured", async () => {
        const isAccessible = jest.fn(async () => true);

        await expect(
            resolveBackupDestination({
                configuredDirectoryUri: null,
                defaultDirectoryUri: "file:///default",
                isAccessible,
            })
        ).resolves.toEqual({
            directoryUri: "file:///default",
            source: "default",
        });

        expect(isAccessible).toHaveBeenCalledTimes(1);
        expect(isAccessible).toHaveBeenCalledWith("file:///default");
    });

    test("fails when the configured destination is inaccessible", async () => {
        const isAccessible = jest.fn(async () => false);

        await expect(
            resolveBackupDestination({
                configuredDirectoryUri: "content://configured",
                defaultDirectoryUri: "file:///default",
                isAccessible,
            })
        ).rejects.toBeInstanceOf(
            BackupDestinationUnavailableError
        );

        expect(isAccessible).toHaveBeenCalledTimes(1);
        expect(isAccessible).not.toHaveBeenCalledWith("file:///default");
    });

    test("fails when the default destination is inaccessible", async () => {
        const isAccessible = jest.fn(async () => false);

        await expect(
            resolveBackupDestination({
                configuredDirectoryUri: null,
                defaultDirectoryUri: "file:///default",
                isAccessible,
            })
        ).rejects.toBeInstanceOf(
            BackupDestinationUnavailableError
        );

        expect(isAccessible).toHaveBeenCalledTimes(1);
        expect(isAccessible).toHaveBeenCalledWith("file:///default");
    });
});

function fakeFileSystem(
    overrides: Partial<jest.Mocked<BackupFileSystem>> = {}
): jest.Mocked<BackupFileSystem> {
    return {
        join: jest.fn(
            (directoryUri: string, filename: string) =>
                `${directoryUri}/${filename}`
        ),
        exists: jest.fn(async (_fileUri: string) => false),
        create: jest.fn(async (_fileUri: string) => {}),
        read: jest.fn(
            async (_fileUri: string) => "encrypted-body"
        ),
        write: jest.fn(
            async (_fileUri: string, _body: string) => {}
        ),
        delete: jest.fn(async (_fileUri: string) => {}),
        ...overrides,
    };
}

describe("writeBackupFile", () => {
    test("creates, writes, and verifies a new backup file", async () => {
        const fileSystem = fakeFileSystem();
        const fileUri = "file:///backups/FreeCBT-backup-2026";

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "FreeCBT-backup-2026",
                body: "encrypted-body",
                fileSystem,
            })
        ).resolves.toEqual({
            fileUri,
            filename: "FreeCBT-backup-2026",
        });

        expect(fileSystem.exists).toHaveBeenCalledWith(fileUri);
        expect(fileSystem.create).toHaveBeenCalledWith(fileUri);
        expect(fileSystem.write).toHaveBeenCalledWith(
            fileUri,
            "encrypted-body"
        );
        expect(fileSystem.read).toHaveBeenCalledWith(fileUri);
        expect(fileSystem.delete).not.toHaveBeenCalled();
    });

    test("refuses to overwrite an existing backup", async () => {
        const fileSystem = fakeFileSystem({
            exists: jest.fn(async (_fileUri: string) => true),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "existing-backup",
                body: "encrypted-body",
                fileSystem,
            })
        ).rejects.toBeInstanceOf(BackupFileAlreadyExistsError);

        expect(fileSystem.create).not.toHaveBeenCalled();
        expect(fileSystem.write).not.toHaveBeenCalled();
        expect(fileSystem.read).not.toHaveBeenCalled();
        expect(fileSystem.delete).not.toHaveBeenCalled();
    });

    test("cleans up a created file when writing fails", async () => {
        const writeError = new Error("write failed");
        const fileSystem = fakeFileSystem({
            write: jest.fn(async (_fileUri: string, _body: string) => {
                throw writeError;
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem,
            })
        ).rejects.toBe(writeError);

        expect(fileSystem.delete).toHaveBeenCalledWith(
            "file:///backups/failed-backup"
        );
        expect(fileSystem.read).not.toHaveBeenCalled();
    });

    test("does not delete when file creation fails", async () => {
        const createError = new Error("create failed");
        const fileSystem = fakeFileSystem({
            create: jest.fn(async (_fileUri: string) => {
                throw createError;
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem,
            })
        ).rejects.toBe(createError);

        expect(fileSystem.write).not.toHaveBeenCalled();
        expect(fileSystem.read).not.toHaveBeenCalled();
        expect(fileSystem.delete).not.toHaveBeenCalled();
    });

    test("cleans up and preserves the read error when verification read fails", async () => {
        const readError = new Error("read failed");
        const fileSystem = fakeFileSystem({
            read: jest.fn(async (_fileUri: string) => {
                throw readError;
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-read",
                body: "encrypted-body",
                fileSystem,
            })
        ).rejects.toBe(readError);

        expect(fileSystem.delete).toHaveBeenCalledWith(
            "file:///backups/failed-read"
        );
    });

    test("preserves the write error when cleanup also fails", async () => {
        const writeError = new Error("write failed");
        const fileSystem = fakeFileSystem({
            write: jest.fn(
                async (
                    _fileUri: string,
                    _body: string
                ): Promise<void> => {
                    throw writeError;
                }
            ),
            delete: jest.fn(
                async (_fileUri: string): Promise<void> => {
                    throw new Error("cleanup failed");
                }
            ),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem,
            })
        ).rejects.toBe(writeError);
    });

    test("fails with a verification error and cleans up when written content does not read back exactly", async () => {
        const fileSystem = fakeFileSystem({
            read: jest.fn(
                async (_fileUri: string): Promise<string> =>
                    "corrupted-body"
            ),
        });
        const fileUri = "file:///backups/failed-verification";

        const result = writeBackupFile({
            directoryUri: "file:///backups",
            filename: "failed-verification",
            body: "encrypted-body",
            fileSystem,
        });

        await expect(result).rejects.toBeInstanceOf(
            BackupWriteVerificationError
        );
        await expect(result).rejects.toMatchObject({
            code: "BACKUP_WRITE_VERIFICATION_FAILED",
            fileUri,
        });

        expect(fileSystem.read).toHaveBeenCalledWith(fileUri);
        expect(fileSystem.delete).toHaveBeenCalledWith(fileUri);
    });
});