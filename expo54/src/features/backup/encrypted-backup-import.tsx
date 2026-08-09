import { SecureBackup } from "@/src";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import { Action } from "@/src/model";
import { BACKUP_IMPORT_MIME_TYPES } from "@/src/platform/sharing/backup-mime";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";
import type { BackupImportControlProps } from "./backup-control-contract";

type ImportPhase =
    | { phase: "idle" }
    | { phase: "restoring" }
    | { phase: "needs-key" }
    | { phase: "fp-mismatch" }
    | { phase: "structural-error" }
    | { phase: "decrypt-error" }
    | { phase: "success" };

export function EncryptedBackupImport(props: BackupImportControlProps) {
    const { model, dispatch, style: s, translate: t } = props;

    const [state, setState] = useState<ImportPhase>({ phase: "idle" });
    const [selectedBody, setSelectedBody] = useState<string | null>(null);
    const [manualKey, setManualKey] = useState("");

    const backup = createSecureBackup(model.distortionData);

    async function restore(
        body: string,
        recoveryKey?: string
    ): Promise<void> {
        setState({ phase: "restoring" });

        try {
            const archive = await backup.restoreArchive(
                body,
                recoveryKey
            );

            dispatch(Action.importArchive(archive));
            setState({ phase: "success" });
        } catch (error) {
            if (error instanceof SecureBackup.InvalidBackupArchiveError) {
                setState({ phase: "structural-error" });
                return;
            }

            if (error instanceof SecureBackup.MissingRecoveryKeyError) {
                setState({ phase: "needs-key" });
                return;
            }

            if (
                error instanceof
                SecureBackup.RecoveryKeyFingerprintMismatchError
            ) {
                setState({ phase: "fp-mismatch" });
                return;
            }

            setState({ phase: "decrypt-error" });
        }
    }

    async function pickBackup(): Promise<void> {
        const result = await DocumentPicker.getDocumentAsync({
            type: [...BACKUP_IMPORT_MIME_TYPES],
        });

        if (result.canceled || !result.assets[0]) {
            return;
        }

        const [asset] = result.assets;

        const body =
            (await asset.file?.text()) ??
            (await new FileSystem.File(asset.uri).text());

        setSelectedBody(body);
        setManualKey("");

        await restore(body);
    }

    async function retryWithManualKey(): Promise<void> {
        if (selectedBody === null) {
            setState({ phase: "structural-error" });
            return;
        }

        await restore(selectedBody, manualKey);
    }

    if (state.phase === "restoring") {
        return <ActivityIndicator />;
    }

    const needsManualKey =
        state.phase === "needs-key" ||
        state.phase === "fp-mismatch";

    return (
        <>
            <TouchableOpacity
                style={[s.button, s.my2]}
                onPress={() => {
                    void pickBackup();
                }}
            >
                <Text style={[s.buttonText]}>
                    {t("backup_screen.import.file.button")}
                </Text>
            </TouchableOpacity>

            {needsManualKey && (
                <>
                    {state.phase === "needs-key" && (
                        <Text style={[s.text]}>
                            {t("backup_screen.import.needs_key")}
                        </Text>
                    )}

                    {state.phase === "fp-mismatch" && (
                        <Text style={[s.errorText]}>
                            {t(
                                "backup_screen.import.fingerprint_mismatch"
                            )}
                        </Text>
                    )}

                    <TextInput
                        testID="recovery-key-entry"
                        style={[s.textInput]}
                        value={manualKey}
                        onChangeText={setManualKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        accessibilityLabel={t(
                            "backup_screen.import.recovery_key.label"
                        )}
                    />

                    <TouchableOpacity
                        style={[s.button, s.my2]}
                        disabled={manualKey.length === 0}
                        onPress={() => {
                            void retryWithManualKey();
                        }}
                    >
                        <Text style={[s.buttonText]}>
                            {t(
                                "backup_screen.import.recovery_key.submit"
                            )}
                        </Text>
                    </TouchableOpacity>
                </>
            )}

            {state.phase === "structural-error" && (
                <Text style={[s.errorText]}>
                    {t("backup_screen.import.structural_error")}
                </Text>
            )}

            {state.phase === "decrypt-error" && (
                <Text style={[s.errorText]}>
                    {t("backup_screen.import.decrypt_error")}
                </Text>
            )}

            {state.phase === "success" && (
                <Text style={[s.text]}>
                    {t("backup_screen.import.success")}
                </Text>
            )}
        </>
    );
}