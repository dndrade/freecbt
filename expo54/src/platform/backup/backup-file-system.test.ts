import {
    Directory,
    Paths,
} from "expo-file-system";
import {
    DEFAULT_BACKUP_DIRECTORY_NAME,
    createDefaultBackupDirectory,
    createExpoBackupFileSystem,
    ensureDefaultBackupDirectory,
    getDefaultBackupDirectoryUri,
} from "./backup-file-system";

const directoryCreate = jest.fn();
const fileCreate = jest.fn();
const fileText = jest.fn();
const fileWrite = jest.fn();
const fileDelete = jest.fn();

jest.mock("expo-file-system", () => {
    class MockDirectory {
        uri: string;
        exists = true;
        create = directoryCreate;

        constructor(...parts: ({ uri: string } | string)[]) {
            this.uri = parts
                .map((part) =>
                    typeof part === "string" ? part : part.uri
                )
                .join("/")
                .replace(/\/{2,}/g, "/")
                .replace("file:/", "file:///");
        }
    }

    class MockFile {
        uri: string;
        exists = false;
        create = fileCreate;
        text = fileText;
        write = fileWrite;
        delete = fileDelete;

        constructor(...parts: ({ uri: string } | string)[]) {
            this.uri = parts
                .map((part) =>
                    typeof part === "string" ? part : part.uri
                )
                .join("/")
                .replace(/\/{2,}/g, "/")
                .replace("file:/", "file:///");
        }
    }

    return {
        Paths: {
            document: {
                uri: "file:///documents",
            },
        },
        Directory: MockDirectory,
        File: MockFile,
    };
});

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

        expect(fileDelete).toHaveBeenCalledTimes(1);
    });
});