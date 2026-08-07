import { Distortion } from "@/src/model";
import * as SecureStore from "expo-secure-store";
import { secureBackup } from "./secure-backup";
import { secureBackupRecoveryKey } from "../storage/storage";

export function createSecureBackup(
  distortionData: Distortion.Data
) {
  const recoveryKeys = secureBackupRecoveryKey(SecureStore);

  return secureBackup(distortionData, recoveryKeys);
}

export type SecureBackupRuntime = ReturnType<
  typeof createSecureBackup
>;
