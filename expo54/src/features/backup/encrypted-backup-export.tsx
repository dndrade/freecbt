import { Archive, Model } from "@/src/model";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import {
    BACKUP_EXPORT_FILENAME,
    BACKUP_EXPORT_MIME_TYPE,
} from "@/src/platform/sharing/backup-mime";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import type { BackupExportControlProps } from "./backup-control-contract";
import { PassphraseForm } from "./passphrase-form";

type ExportPhase =
    | { phase: "idle" }
    | { phase: "encrypting" }
    | { phase: "ready"; body: string }
    | { phase: "error"; message: string };

export function EncryptedBackupExport(props: BackupExportControlProps) {
    const { model, style: s, translate: t } = props;
    const [state, setState] = useState<ExportPhase>({ phase: "idle" });

    const encodeEncrypted = Archive.createEncodeEncrypted(model.distortionData);

    async function submitPassphrase(passphrase: string): Promise<void> {
        setState({ phase: "encrypting" });

        try {
            const body = await encodeEncrypted(
                Model.toArchive(model),
                passphrase
            );

            setState({ phase: "ready", body });
        } catch {
            setState({
                phase: "error",
                message: t("backup_screen.export.share.unavailable"),
            });
        }
    }

    if (state.phase === "idle") {
        return (
            <PassphraseForm
                mode="export"
                onSubmit={(passphrase) => {
                    void submitPassphrase(passphrase);
                }}
                onCancel={() => {}}
                style={s}
                translate={t}
            />
        );
    }

    if (state.phase === "encrypting") {
        return <ActivityIndicator />;
    }

    if (state.phase === "error") {
        return <Text style={[s.errorText]}>{state.message}</Text>;
    }

    return (
        <DownloadOrShareLink
            name={BACKUP_EXPORT_FILENAME}
            body={() => state.body}
            type={BACKUP_EXPORT_MIME_TYPE}
            UTI="org.erosson.freecbt.backup"
            translate={t}
            error={(error) => <Text style={[s.errorText]}>{error}</Text>}
            share={(onPress) => (
                <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
                    <Text style={[s.buttonText]}>
                        {t("backup_screen.export.share.button")}
                    </Text>
                </TouchableOpacity>
            )}
            download={() => (
                <TouchableOpacity style={[s.button, s.my2]}>
                    <Text style={[s.buttonText]}>
                        {t("backup_screen.export.file.button")}
                    </Text>
                </TouchableOpacity>
            )}
        />
    );
}