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
import {
    Action,
    Archive,
    Model,
} from "@/src/model";
import type { WrittenBackupFile } from "@/src/platform/backup/backup-destination";
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
    const [lastBackup, setLastBackup] =
        useState<WrittenBackupFile | null>(null);
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
                            setLastBackup(null);
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
                            setLastBackup(null);
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

                            setLastBackup(written);
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

            <DebugSection title="4. Persistent Archive-v3 restore">
                <DebugAction
                    label="Restore the persistent backup"
                    detail={
                        lastBackup === null
                            ? "Create a persistent backup first."
                            : `Reads and restores ${lastBackup.filename}.`
                    }
                    disabled={
                        running ||
                        !readyForArchiveV3 ||
                        lastBackup === null
                    }
                    onPress={() =>
                        void run("Restoring persistent backup…", async () => {
                            if (lastBackup === null) {
                                throw new Error("no persistent backup is available");
                            }

                            const expected = Model.toArchive(props.model);
                            const restored = await backup.restoreBackupFile(
                                lastBackup.fileUri
                            );

                            verifyArchiveIdentity(expected, restored);
                            props.dispatch(Action.importArchive(restored));

                            setResult(
                                [
                                    "Persistent Archive-v3 backup restored.",
                                    `Filename: ${lastBackup.filename}`,
                                    `URI: ${lastBackup.fileUri}`,
                                    `Thoughts verified: ${restored.thoughts.length}`,
                                    "Import action dispatched.",
                                ].join("\n")
                            );
                        })
                    }
                />

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

function verifyArchiveIdentity(
    expected: Archive.Archive,
    restored: Archive.Archive
): void {
    if (expected.thoughts.length !== restored.thoughts.length) {
        throw new Error(
            `restored thought count mismatch: expected ${expected.thoughts.length}, received ${restored.thoughts.length}`
        );
    }

    for (let index = 0; index < expected.thoughts.length; index += 1) {
        const expectedThought = expected.thoughts[index];
        const restoredThought = restored.thoughts[index];

        if (expectedThought.uuid !== restoredThought.uuid) {
            throw new Error(
                `restored thought identity mismatch at index ${index}`
            );
        }
    }
}