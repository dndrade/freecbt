import { Distortion } from "@/src/model";
import * as SecureStore from "expo-secure-store";
import {
    createExpoBackupFileSystem,
    ensureDefaultBackupDirectory,
} from "./backup-file-system";
import { secureBackup } from "./secure-backup";
import { secureBackupRecoveryKey } from "../storage/storage";

export function createSecureBackup(
    distortionData: Distortion.Data
) {
    const recoveryKeys = secureBackupRecoveryKey(SecureStore);
    const defaultDirectory = ensureDefaultBackupDirectory();

    return secureBackup(
        distortionData,
        recoveryKeys,
        {
            async getConfiguredDirectoryUri() {
                return null;
            },
            defaultDirectoryUri: defaultDirectory.uri,
            async isAccessible(directoryUri) {
                return (
                    directoryUri === defaultDirectory.uri &&
                    defaultDirectory.exists
                );
            },
            fileSystem: createExpoBackupFileSystem(),
            now: () => new Date(),
        }
    );
}
