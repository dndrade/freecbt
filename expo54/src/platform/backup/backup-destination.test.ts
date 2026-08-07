import {
    BACKUP_FILENAME_PREFIX,
    BackupDestinationUnavailableError,
    BackupFileAlreadyExistsError,
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

        expect(isAccessible).toHaveBeenCalledWith("file:///default");
    });
});

function fakeFileSystem(overrides: Partial<BackupFileSystem> = {}): {
    fileSystem: BackupFileSystem;
    join: jest.Mock<string, [string, string]>;
    exists: jest.Mock<Promise<boolean>, [string]>;
    create: jest.Mock<Promise<void>, [string]>;
    read: jest.Mock<Promise<string>, [string]>;
    write: jest.Mock<Promise<void>, [string, string]>;
    remove: jest.Mock<Promise<void>, [string]>;
} {
    const join = jest.fn(
        (directoryUri: string, filename: string) =>
            `${directoryUri}/${filename}`
    );
    const exists = jest.fn(async (_fileUri: string) => false);
    const create = jest.fn(async (_fileUri: string) => {});
    const read = jest.fn(async (_fileUri: string) => "body");
    const write = jest.fn(
        async (_fileUri: string, _body: string) => {}
    );
    const remove = jest.fn(async (_fileUri: string) => {});

    return {
        fileSystem: {
            join,
            exists,
            create,
            read,
            write,
            delete: remove,
            ...overrides,
        },
        join,
        exists,
        create,
        read,
        write,
        remove,
    };
}

describe("writeBackupFile", () => {
    test("creates and writes a new backup file", async () => {
        const fs = fakeFileSystem();

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "FreeCBT-backup-2026",
                body: "encrypted-body",
                fileSystem: fs.fileSystem,
            })
        ).resolves.toEqual({
            fileUri: "file:///backups/FreeCBT-backup-2026",
            filename: "FreeCBT-backup-2026",
        });

        expect(fs.exists).toHaveBeenCalledWith(
            "file:///backups/FreeCBT-backup-2026"
        );
        expect(fs.create).toHaveBeenCalledWith(
            "file:///backups/FreeCBT-backup-2026"
        );
        expect(fs.write).toHaveBeenCalledWith(
            "file:///backups/FreeCBT-backup-2026",
            "encrypted-body"
        );
        expect(fs.remove).not.toHaveBeenCalled();
    });

    test("refuses to overwrite an existing backup", async () => {
        const fs = fakeFileSystem({
            exists: jest.fn(async () => true),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "existing-backup",
                body: "encrypted-body",
                fileSystem: fs.fileSystem,
            })
        ).rejects.toBeInstanceOf(BackupFileAlreadyExistsError);

        expect(fs.create).not.toHaveBeenCalled();
        expect(fs.write).not.toHaveBeenCalled();
        expect(fs.remove).not.toHaveBeenCalled();
    });

    test("cleans up a created file when writing fails", async () => {
        const writeError = new Error("write failed");
        const fs = fakeFileSystem({
            write: jest.fn(async () => {
                throw writeError;
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem: fs.fileSystem,
            })
        ).rejects.toBe(writeError);

        expect(fs.remove).toHaveBeenCalledWith(
            "file:///backups/failed-backup"
        );
    });

    test("does not delete when file creation fails", async () => {
        const createError = new Error("create failed");
        const fs = fakeFileSystem({
            create: jest.fn(async () => {
                throw createError;
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem: fs.fileSystem,
            })
        ).rejects.toBe(createError);

        expect(fs.write).not.toHaveBeenCalled();
        expect(fs.remove).not.toHaveBeenCalled();
    });

    test("preserves the write error when cleanup also fails", async () => {
        const writeError = new Error("write failed");
        const fs = fakeFileSystem({
            write: jest.fn(async () => {
                throw writeError;
            }),
            delete: jest.fn(async () => {
                throw new Error("cleanup failed");
            }),
        });

        await expect(
            writeBackupFile({
                directoryUri: "file:///backups",
                filename: "failed-backup",
                body: "encrypted-body",
                fileSystem: fs.fileSystem,
            })
        ).rejects.toBe(writeError);
    });
});