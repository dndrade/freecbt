import { SecureBackup } from "@/src";
import { RecoveryKeyDisplay } from "@/src/debug/ui/backup/recovery-key-display";
import {
    type WorkflowKeyStatus,
    WorkflowStatus,
} from "@/src/debug/ui/backup/workflow-status";
import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugResult } from "@/src/debug/ui/debug-result";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { EncryptedBackupImport } from "@/src/features/backup/encrypted-backup-import";
import {
    LoadModel,
    type ModelLoadedProps,
} from "@/src/hooks/use-model";
import { Model } from "@/src/model";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import React, { useMemo, useState } from "react";

export default function RecoveryKeyWorkflow() {
    if (!__DEV__) {
        return null;
    }

    return <LoadModel ready={Ready} />;
}

function Ready(props: ModelLoadedProps) {
    const [keyStatus, setKeyStatus] =
        useState<WorkflowKeyStatus>("unchecked");
    const [recoveryKey, setRecoveryKey] =
        useState<string | null>(null);
    const [confirmedSaved, setConfirmedSaved] = useState(false);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState("No workflow action yet.");

    const backup = useMemo(
        () => createSecureBackup(props.model.distortionData),
        [props.model.distortionData]
    );

    const readyForArchiveV3 =
        keyStatus === "configured" &&
        recoveryKey !== null &&
        confirmedSaved;

    async function run(
        message: string,
        action: () => Promise<void>
    ): Promise<void> {
        setRunning(true);
        setResult(message);

        try {
            await action();
        } catch (error) {
            setResult(
                error instanceof Error
                    ? `FAILED: ${error.message}`
                    : "FAILED: unknown error"
            );
        } finally {
            setRunning(false);
        }
    }

    return (
        <DebugScreen
            title="Recovery-key workflow"
            description="Run the production Archive-v3 setup and persistent backup procedure in order."
            metadata={
                <WorkflowStatus
                    style={props.style}
                    keyStatus={keyStatus}
                    confirmedSaved={confirmedSaved}
                    readyForArchiveV3={readyForArchiveV3}
                />
            }
        >
            <DebugSection title="1. Recovery-key lifecycle">
                <DebugAction
                    label="Check recovery-key status"
                    disabled={running}
                    onPress={() =>
                        void run("Checking recovery-key status…", async () => {
                            const status = await backup.getRecoveryKeyStatus();

                            setKeyStatus(status);
                            setRecoveryKey(null);
                            setConfirmedSaved(false);
                            setResult(
                                status === "configured"
                                    ? "Recovery key exists."
                                    : "Recovery key is missing."
                            );
                        })
                    }
                />

                <DebugAction
                    label="Create recovery key"
                    disabled={running || keyStatus === "configured"}
                    onPress={() =>
                        void run("Creating recovery key…", async () => {
                            const value = await backup.setupRecoveryKey();

                            setRecoveryKey(value);
                            setKeyStatus("configured");
                            setConfirmedSaved(false);
                            setResult("Recovery key created and revealed.");
                        })
                    }
                />

                <DebugAction
                    label="Reveal stored recovery key"
                    disabled={running || keyStatus !== "configured"}
                    onPress={() =>
                        void run("Reading recovery key…", async () => {
                            try {
                                const value = await backup.revealRecoveryKey();

                                setRecoveryKey(value);
                                setResult("Recovery key revealed.");
                            } catch (error) {
                                if (
                                    error instanceof
                                    SecureBackup.MissingRecoveryKeyError
                                ) {
                                    setKeyStatus("missing");
                                }

                                throw error;
                            }
                        })
                    }
                />
            </DebugSection>

            <DebugSection title="2. Save and confirm">
                <RecoveryKeyDisplay
                    style={props.style}
                    recoveryKey={recoveryKey}
                />

                <DebugAction
                    label="I saved the recovery key"
                    disabled={
                        running ||
                        recoveryKey === null ||
                        confirmedSaved
                    }
                    onPress={() => {
                        setConfirmedSaved(true);
                        setResult("Recovery-key saving confirmed.");
                    }}
                />
            </DebugSection>

            <DebugSection title="3. Persistent Archive-v3 backup">
                <DebugAction
                    label="Create persistent Archive-v3 backup"
                    detail="Writes a new encrypted file to the app-owned FreeCBT-backups directory."
                    disabled={running || !readyForArchiveV3}
                    onPress={() =>
                        void run("Creating persistent backup…", async () => {
                            const written = await backup.createBackup(
                                Model.toArchive(props.model)
                            );

                            setResult(
                                [
                                    "Persistent Archive-v3 backup created.",
                                    `Filename: ${written.filename}`,
                                    `URI: ${written.fileUri}`,
                                ].join("\n")
                            );
                        })
                    }
                />
            </DebugSection>

            <DebugSection title="4. Archive-v3 restore">
                {readyForArchiveV3 && (
                    <EncryptedBackupImport
                        model={props.model}
                        dispatch={props.dispatch}
                        style={props.style}
                        translate={props.translate}
                    />
                )}
            </DebugSection>

            <DebugResult running={running} value={result} />
        </DebugScreen>
    );
}