import {
    Directory,
    File,
    Paths,
} from "expo-file-system";
import {
    DEFAULT_BACKUP_DIRECTORY_NAME,
    createDefaultBackupDirectory,
    createExpoBackupFileSystem,
    ensureDefaultBackupDirectory,
    getDefaultBackupDirectoryUri,
    pruneOldBackups,
} from "@/src/platform/backup/backup-file-system";
import {
    directoryCreate,
    directoryList,
    fileCreate,
    fileText,
    fileWrite,
    fileDelete,
} from "@/tests/support/mocks/expo-file-system"

jest.mock("expo-file-system", () =>
    jest.requireActual("@/tests/support/mocks/expo-file-system")
);


describe("default backup directory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("uses the app-owned document directory", () => {
        const directory = createDefaultBackupDirectory();

        expect(directory).toBeInstanceOf(Directory);
        expect(directory.uri).toBe(
            `file:///documents/${DEFAULT_BACKUP_DIRECTORY_NAME}`
        );
        expect(Paths.document.uri).toBe("file:///documents");
    });

    test("creates the directory idempotently", () => {
        const directory = ensureDefaultBackupDirectory();

        expect(directoryCreate).toHaveBeenCalledWith({
            intermediates: true,
            idempotent: true,
        });
        expect(directory.uri).toBe(
            "file:///documents/FreeCBT-backups"
        );
    });

    test("returns the exact persistent directory URI", () => {
        expect(getDefaultBackupDirectoryUri()).toBe(
            "file:///documents/FreeCBT-backups"
        );
    });
});

describe("createExpoBackupFileSystem", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("joins a directory URI and filename", () => {
        const fileSystem = createExpoBackupFileSystem();

        expect(
            fileSystem.join(
                "file:///documents/FreeCBT-backups",
                "FreeCBT-backup-2026"
            )
        ).toBe(
            "file:///documents/FreeCBT-backups/FreeCBT-backup-2026"
        );
    });

    test("reports file existence", async () => {
        const fileSystem = createExpoBackupFileSystem();

        await expect(
            fileSystem.exists("file:///documents/backup")
        ).resolves.toBe(false);
    });

    test("creates without overwrite", async () => {
        const fileSystem = createExpoBackupFileSystem();

        await fileSystem.create("file:///documents/backup");

        expect(fileCreate).toHaveBeenCalledWith({
            intermediates: false,
            overwrite: false,
        });
    });

    test("reads the exact file as text", async () => {
        fileText.mockResolvedValue("encrypted-body");
        const fileSystem = createExpoBackupFileSystem();

        await expect(
            fileSystem.read("file:///documents/backup")
        ).resolves.toBe("encrypted-body");

        expect(fileText).toHaveBeenCalledTimes(1);
    });

    test("writes the supplied archive body", async () => {
        const fileSystem = createExpoBackupFileSystem();

        await fileSystem.write(
            "file:///documents/backup",
            "encrypted-body"
        );

        expect(fileWrite).toHaveBeenCalledWith("encrypted-body");
    });

    test("deletes the exact file", async () => {
        const fileSystem = createExpoBackupFileSystem();

        await fileSystem.delete("file:///documents/backup");

        expect(fileDelete).toHaveBeenCalledWith(
            "file:///documents/backup"
        );
    });

    test("prunes FreeCBT backups beyond the two most recent", async () => {
        const fileSystem = createExpoBackupFileSystem();

        directoryList.mockReturnValue([
            new File(
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-06T03-00-00-000Z"
            ),
            new File(
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-08T03-00-00-000Z"
            ),
            new File(
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-07T03-00-00-000Z"
            ),
            new File(
                "file:///documents/FreeCBT-backups/notes.txt"
            ),
        ]);

        await pruneOldBackups(
            "file:///documents/FreeCBT-backups",
            fileSystem
        );

        expect(fileDelete).toHaveBeenCalledTimes(1);
        expect(fileDelete).toHaveBeenCalledWith(
            "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-06T03-00-00-000Z"
        );
    });
});