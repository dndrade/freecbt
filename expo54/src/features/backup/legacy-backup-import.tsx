import { Action, Archive, Model } from "@/src/model";
import {
    BACKUP_IMPORT_MIME_TYPES,
} from "@/src/platform/sharing/backup-mime";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Typography } from "heroui-native";
import type { BackupImportControlProps } from "./backup-control-contract";

export function LegacyBackupImport(props: BackupImportControlProps) {
    const { model, dispatch, style: s, translate: t } = props;
    const [importResult, setImportResult] = useState("");

    const parser = Archive.createParsers(model.distortionData);

    function encodeCurrentArchive(): string {
        return parser.fromString.encode(Model.toArchive(model));
    }

    async function importBackup(): Promise<void> {
        const result = await DocumentPicker.getDocumentAsync({
            type: [...BACKUP_IMPORT_MIME_TYPES],
        });

        if (result.canceled || !result.assets[0]) {
            return;
        }

        const [asset] = result.assets;

        const body =
            // Web
            (await asset.file?.text()) ??
            // Mobile
            (await new FileSystem.File(asset.uri).text());

        if (encodeCurrentArchive().trim() === body.trim()) {
            setImportResult(t("backup_screen.import.noop"));
            return;
        }

        const imported = parser.fromString.safeDecode(body);

        if (!imported.success) {
            setImportResult(t("backup_screen.import.file.failure"));
            return;
        }

        dispatch(Action.importArchive(imported.data));
        setImportResult(t("backup_screen.import.success"));
    }

    return (
        <>
            <TouchableOpacity
                style={[s.button, s.my2]}
                onPress={() => {
                    void importBackup();
                }}
            >
                <Typography type="body-sm">
                    {t("backup_screen.import.file.button")}
                </Typography>
            </TouchableOpacity>

            <Typography type="body-sm">{importResult}</Typography>
        </>
    );
}