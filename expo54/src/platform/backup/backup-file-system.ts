import {
    Directory,
    File,
    Paths,
} from "expo-file-system";
import type { BackupFileSystem } from "./backup-destination";

export const DEFAULT_BACKUP_DIRECTORY_NAME = "FreeCBT-backups";

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

        async write(fileUri, body) {
            new File(fileUri).write(body);
        },

        async delete(fileUri) {
            new File(fileUri).delete();
        },
    };
}
