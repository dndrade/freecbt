import {
    Directory,
    File,
    Paths,
} from "expo-file-system";
import {
    BACKUP_FILENAME_PREFIX,
    type BackupFileSystem,
} from "./backup-destination";

export const DEFAULT_BACKUP_DIRECTORY_NAME = "FreeCBT-backups";

export const MAX_RETAINED_BACKUPS = 2;

// TODO(iOS): persistent user-selected directories are not supported yet.
// Directory picker access is session-scoped on iOS.
// This adapter uses only the app-owned document directory.
export function createDefaultBackupDirectory(): Directory {
    return new Directory(
        Paths.document,
        DEFAULT_BACKUP_DIRECTORY_NAME
    );
}

export function ensureDefaultBackupDirectory(): Directory {
    const directory = createDefaultBackupDirectory();

    directory.create({
        intermediates: true,
        idempotent: true,
    });

    return directory;
}

export function getDefaultBackupDirectoryUri(): string {
    return ensureDefaultBackupDirectory().uri;
}

export function createExpoBackupFileSystem(): BackupFileSystem {
    return {
        join(directoryUri, filename) {
            return new File(directoryUri, filename).uri;
        },

        async exists(fileUri) {
            return new File(fileUri).exists;
        },

        async create(fileUri) {
            new File(fileUri).create({
                intermediates: false,
                overwrite: false,
            });
        },

        async read(fileUri) {
            return await new File(fileUri).text();
        },

        async write(fileUri, body) {
            new File(fileUri).write(body);
        },

        async listFiles(directoryUri) {
            return new Directory(directoryUri)
                .list()
                .filter((entry): entry is File => entry instanceof File)
                .map((file) => ({
                    uri: file.uri,
                    name: file.name,
                }));
        },

        async delete(fileUri) {
            new File(fileUri).delete();
        },
    };
}

export async function pruneOldBackups(
    directoryUri: string,
    fileSystem: BackupFileSystem
): Promise<void> {
    const backups = (await fileSystem.listFiles(directoryUri))
        .filter((file) =>
            file.name.startsWith(`${BACKUP_FILENAME_PREFIX}-`)
        )
        .sort((a, b) => b.name.localeCompare(a.name));

    for (const backup of backups.slice(MAX_RETAINED_BACKUPS)) {
        await fileSystem.delete(backup.uri);
    }
}