export const BACKUP_FILENAME_PREFIX = "FreeCBT-backup";

export class BackupDestinationUnavailableError extends Error {
    constructor(directoryUri: string) {
        super(`backup destination is unavailable: ${directoryUri}`);
        this.name = "BackupDestinationUnavailableError";
        Object.setPrototypeOf(
            this,
            BackupDestinationUnavailableError.prototype
        );
    }
}

export class BackupFileAlreadyExistsError extends Error {
    constructor(fileUri: string) {
        super(`backup file already exists: ${fileUri}`);
        this.name = "BackupFileAlreadyExistsError";
        Object.setPrototypeOf(
            this,
            BackupFileAlreadyExistsError.prototype
        );
    }
}

export type BackupDestinationSource = "configured" | "default";

export type ResolvedBackupDestination = {
    directoryUri: string;
    source: BackupDestinationSource;
};

export type ResolveBackupDestinationOptions = {
    configuredDirectoryUri: string | null;
    defaultDirectoryUri: string;
    isAccessible: (directoryUri: string) => Promise<boolean>;
};

export type BackupFileSystem = {
    join(directoryUri: string, filename: string): string;
    exists(fileUri: string): Promise<boolean>;
    create(fileUri: string): Promise<void>;
    read(fileUri: string): Promise<string>;
    write(fileUri: string, body: string): Promise<void>;
    delete(fileUri: string): Promise<void>;
};

export type WriteBackupFileOptions = {
    directoryUri: string;
    filename: string;
    body: string;
    fileSystem: BackupFileSystem;
};

export type WrittenBackupFile = {
    fileUri: string;
    filename: string;
};

export function createBackupFilename(date: Date): string {
    const safeTimestamp = date
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");

    return `${BACKUP_FILENAME_PREFIX}-${safeTimestamp}`;
}

export async function resolveBackupDestination(
    options: ResolveBackupDestinationOptions
): Promise<ResolvedBackupDestination> {
    const {
        configuredDirectoryUri,
        defaultDirectoryUri,
        isAccessible,
    } = options;

    if (configuredDirectoryUri !== null) {
        if (!(await isAccessible(configuredDirectoryUri))) {
            throw new BackupDestinationUnavailableError(
                configuredDirectoryUri
            );
        }

        return {
            directoryUri: configuredDirectoryUri,
            source: "configured",
        };
    }

    if (!(await isAccessible(defaultDirectoryUri))) {
        throw new BackupDestinationUnavailableError(defaultDirectoryUri);
    }

    return {
        directoryUri: defaultDirectoryUri,
        source: "default",
    };
}

export async function writeBackupFile(
    options: WriteBackupFileOptions
): Promise<WrittenBackupFile> {
    const {
        directoryUri,
        filename,
        body,
        fileSystem,
    } = options;
    const fileUri = fileSystem.join(directoryUri, filename);

    if (await fileSystem.exists(fileUri)) {
        throw new BackupFileAlreadyExistsError(fileUri);
    }

    let created = false;

    try {
        await fileSystem.create(fileUri);
        created = true;
        await fileSystem.write(fileUri, body);
    } catch (error) {
        if (created) {
            try {
                await fileSystem.delete(fileUri);
            } catch {
                // Preserve the original create/write failure.
            }
        }

        throw error;
    }

    return {
        fileUri,
        filename,
    };
}