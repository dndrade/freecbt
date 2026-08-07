import {
    BACKUP_FILENAME_PREFIX,
    BackupDestinationUnavailableError,
    createBackupFilename,
    resolveBackupDestination,
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
