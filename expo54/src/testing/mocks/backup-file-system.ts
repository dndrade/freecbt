import type { BackupFileSystem } from "@/src/platform/backup/backup-destination";

export function fakeBackupFileSystem(
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
        listFiles: jest.fn(async (_directoryUri: string) => []),
        delete: jest.fn(async (_fileUri: string) => {}),
        ...overrides,
    };
}