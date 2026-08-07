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
    TouchableOpacity,
} from "react-native";
import type { BackupImportControlProps } from "./backup-control-contract";

type ImportPhase =
    | { phase: "idle" }
    | { phase: "restoring" }
    | { phase: "structural-error" }
    | { phase: "decrypt-error" }
    | { phase: "success" };

export function EncryptedBackupImport(props: BackupImportControlProps) {
    const { model, dispatch, style: s, translate: t } = props;
    const [state, setState] = useState<ImportPhase>({ phase: "idle" });

    const backup = createSecureBackup(model.distortionData);

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

        setState({ phase: "restoring" });

        try {
            const archive = await backup.restoreArchive(body);
            dispatch(Action.importArchive(archive));
            setState({ phase: "success" });
        } catch (error) {
            if (error instanceof SecureBackup.InvalidBackupArchiveError) {
                setState({ phase: "structural-error" });
                return;
            }

            setState({ phase: "decrypt-error" });
        }
    }

    if (state.phase === "restoring") {
        return <ActivityIndicator />;
    }

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