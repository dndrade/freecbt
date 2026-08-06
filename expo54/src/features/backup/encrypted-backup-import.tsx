import { Action, Archive } from "@/src/model";
import { BACKUP_IMPORT_MIME_TYPES } from "@/src/platform/sharing/backup-mime";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import type { BackupImportControlProps } from "./backup-control-contract";
import { PassphraseForm } from "./passphrase-form";

type ImportPhase =
    | { phase: "idle" }
    | {
    phase: "needs-passphrase";
    decrypt: (passphrase: string) => Promise<Archive.Archive>;
}
    | { phase: "structural-error" }
    | { phase: "decrypt-error" }
    | { phase: "success" };

export function EncryptedBackupImport(props: BackupImportControlProps) {
    const { model, dispatch, style: s, translate: t } = props;
    const [state, setState] = useState<ImportPhase>({ phase: "idle" });

    const decodeFile = Archive.createDecodeFile(model.distortionData);

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

        const decoded = decodeFile(body);

        if (decoded.kind === "invalid") {
            setState({ phase: "structural-error" });
            return;
        }

        if (decoded.kind === "encrypted") {
            setState({
                phase: "needs-passphrase",
                decrypt: decoded.decrypt,
            });
            return;
        }

        dispatch(Action.importArchive(decoded.archive));
        setState({ phase: "success" });
    }

    async function submitPassphrase(passphrase: string): Promise<void> {
        if (state.phase !== "needs-passphrase") {
            return;
        }

        try {
            const archive = await state.decrypt(passphrase);
            dispatch(Action.importArchive(archive));
            setState({ phase: "success" });
        } catch {
            setState({ phase: "decrypt-error" });
        }
    }

    if (state.phase === "needs-passphrase") {
        return (
            <PassphraseForm
                mode="import"
                onSubmit={(passphrase) => {
                    void submitPassphrase(passphrase);
                }}
                onCancel={() => {
                    setState({ phase: "idle" });
                }}
                style={s}
                translate={t}
            />
        );
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