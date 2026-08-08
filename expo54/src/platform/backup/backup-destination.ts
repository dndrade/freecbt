export const BACKUP_FILENAME_PREFIX = "FreeCBT-backup";

export type BackupErrorCode =
    | "BACKUP_DESTINATION_UNAVAILABLE"
    | "BACKUP_FILE_ALREADY_EXISTS"
    | "BACKUP_WRITE_VERIFICATION_FAILED";

export abstract class BackupError extends Error {
    abstract readonly code: BackupErrorCode;

    protected constructor(message: string) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BackupDestinationUnavailableError extends BackupError {
    readonly code = "BACKUP_DESTINATION_UNAVAILABLE";

    constructor(readonly directoryUri: string) {
        super(`backup destination is unavailable: ${directoryUri}`);
    }
}

export class BackupFileAlreadyExistsError extends BackupError {
    readonly code = "BACKUP_FILE_ALREADY_EXISTS";

    constructor(readonly fileUri: string) {
        super(`backup file already exists: ${fileUri}`);
    }
}

export class BackupWriteVerificationError extends BackupError {
    readonly code = "BACKUP_WRITE_VERIFICATION_FAILED";

    constructor(readonly fileUri: string) {
        super(`backup write verification failed: ${fileUri}`);
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

async function deleteCreatedBackupBestEffort(
    fileSystem: BackupFileSystem,
    fileUri: string
): Promise<void> {
    try {
        await fileSystem.delete(fileUri);
    } catch {
        // Cleanup is best-effort. Preserve the primary backup failure.
    }
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
    let writtenBody: string;

    try {
        await fileSystem.create(fileUri);
        created = true;

        await fileSystem.write(fileUri, body);
        writtenBody = await fileSystem.read(fileUri);
    } catch (error) {
        if (created) {
            await deleteCreatedBackupBestEffort(fileSystem, fileUri);
        }

        throw error;
    }

    if (writtenBody !== body) {
        await deleteCreatedBackupBestEffort(fileSystem, fileUri);
        throw new BackupWriteVerificationError(fileUri);
    }

    return {
        fileUri,
        filename,
    };
}