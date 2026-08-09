import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import { Model } from "@/src/model";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
} from "react-native";
import type { BackupExportControlProps } from "./backup-control-contract";

type ExportPhase =
    | { phase: "idle" }
    | { phase: "creating" }
    | {
    phase: "created";
    fileUri: string;
    filename: string;
    recoveryKey: string;
}
    | { phase: "error"; message: string };

export function EncryptedBackupExport(props: BackupExportControlProps) {
    const { model, style: s, translate: t } = props;
    const [state, setState] = useState<ExportPhase>({ phase: "idle" });

    const backup = createSecureBackup(model.distortionData);

    async function prepareEncryptedBackup(): Promise<void> {
        setState({ phase: "creating" });

        let written;

        try {
            written = await backup.createBackup(Model.toArchive(model));
        } catch {
            setState({
                phase: "error",
                message: t("backup_screen.export.share.unavailable"),
            });
            return;
        }

        try {
            const recoveryKey = await backup.revealRecoveryKey();

            setState({
                phase: "created",
                fileUri: written.fileUri,
                filename: written.filename,
                recoveryKey,
            });
        } catch {
            setState({
                phase: "error",
                message: t(
                    "backup_screen.export.recovery_key.unavailable"
                ),
            });
        }
    }

    if (state.phase === "idle") {
        return (
            <TouchableOpacity
                style={[s.button, s.my2]}
                onPress={() => {
                    void prepareEncryptedBackup();
                }}
            >
                <Text style={[s.buttonText]}>
                    {t("backup_screen.export.share.button")}
                </Text>
            </TouchableOpacity>
        );
    }

    if (state.phase === "creating") {
        return <ActivityIndicator />;
    }

    if (state.phase === "error") {
        return <Text style={[s.errorText]}>{state.message}</Text>;
    }

    return (
        <>
            <Text style={[s.text]}>
                {t("backup_screen.export.success")}
            </Text>

            <Text style={[s.header]}>
                {t("backup_screen.export.recovery_key.header")}
            </Text>

            <Text style={[s.text, s.my2]}>
                {t("backup_screen.export.recovery_key.warning")}
            </Text>

            <Text style={[s.text]}>
                {t("backup_screen.export.recovery_key.label")}
            </Text>

            <Text selectable style={[s.text, s.my2]}>
                {state.recoveryKey}
            </Text>

            <Text style={[s.text]}>
                {state.filename}
            </Text>
        </>
    );
}
