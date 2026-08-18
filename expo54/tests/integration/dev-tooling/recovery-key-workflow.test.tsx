import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import {
    Action,
    Model,
} from "@/src/model";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import RecoveryKeyWorkflow from "@/src/app/v2/debug/diagnostics/backup/recovery-key-workflow";

const dispatch = jest.fn();

const model = {
    distortionData: {},
};

const archive = {
    thoughts: [
        {
            uuid: "thought-1",
        },
    ],
};

const restoredArchive = {
    thoughts: [
        {
            uuid: "thought-1",
        },
    ],
};

const createBackup = jest.fn();
const restoreBackupFile = jest.fn();
const getRecoveryKeyStatus = jest.fn();
const revealRecoveryKey = jest.fn();

jest.mock("@/src", () => ({
    SecureBackup: {
        MissingRecoveryKeyError: class MissingRecoveryKeyError extends Error {},
    },
}));

jest.mock("@/src/hooks/use-model", () => ({
    LoadModel: (props: {
        ready: React.ComponentType<Record<string, unknown>>;
    }) => {
        const Ready = props.ready;

        return (
            <Ready
                model={model}
                dispatch={dispatch}
                style={{}}
                translate={(key: string) => key}
            />
        );
    },
}));

jest.mock("@/src/model", () => {
    const actual = jest.requireActual("@/src/model");

    return {
        ...actual,
        Action: {
            ...actual.Action,
            importArchive: jest.fn(),
        },
        Model: {
            ...actual.Model,
            toArchive: jest.fn(),
        },
    };
});

jest.mock(
    "@/src/platform/backup/secure-backup-runtime",
    () => ({
        createSecureBackup: jest.fn(),
    })
);

jest.mock("@/src/debug/ui/debug-screen", () => ({
    DebugScreen: (props: {
        children: React.ReactNode;
        metadata?: React.ReactNode;
    }) => (
        <View>
            {props.metadata}
            {props.children}
        </View>
    ),
}));

jest.mock("@/src/debug/ui/debug-section", () => ({
    DebugSection: (props: {
        children: React.ReactNode;
    }) => <View>{props.children}</View>,
}));

jest.mock("@/src/debug/ui/debug-action", () => ({
    DebugAction: (props: {
        label: string;
        onPress: () => void;
        disabled?: boolean;
    }) => (
        <Pressable
            accessibilityRole="button"
            disabled={props.disabled}
            onPress={props.onPress}
        >
            <Text>{props.label}</Text>
        </Pressable>
    ),
}));

jest.mock("@/src/debug/ui/debug-result", () => ({
    DebugResult: (props: { value: string }) => (
        <Text testID="debug-result">{props.value}</Text>
    ),
}));

jest.mock(
    "@/src/debug/ui/backup/recovery-key-display",
    () => ({
        RecoveryKeyDisplay: () => null,
    })
);

jest.mock(
    "@/src/debug/ui/backup/workflow-status",
    () => ({
        WorkflowStatus: () => null,
    })
);

jest.mock(
    "@/src/features/backup/encrypted-backup-import",
    () => ({
        EncryptedBackupImport: () => null,
    })
);

describe("RecoveryKeyWorkflow persistent backup", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        getRecoveryKeyStatus.mockResolvedValue("configured");
        revealRecoveryKey.mockResolvedValue("recovery-key");
        createBackup.mockResolvedValue({
            filename: "FreeCBT-backup-2026-08-07",
            fileUri:
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-07",
        });
        restoreBackupFile.mockResolvedValue(restoredArchive);

        jest.mocked(createSecureBackup).mockReturnValue({
            getRecoveryKeyStatus,
            setupRecoveryKey: jest.fn(),
            revealRecoveryKey,
            exportArchiveV3: jest.fn(),
            restoreArchive: jest.fn(),
            createBackup,
            restoreBackupFile,
        });

        jest.mocked(Model.toArchive).mockReturnValue(archive as never);
        jest.mocked(Action.importArchive).mockReturnValue({
            action: "import-archive",
            value: restoredArchive,
        } as never);
    });

    test("creates, restores, verifies, and dispatches the persistent backup", async () => {
        render(<RecoveryKeyWorkflow />);

        fireEvent.press(
            screen.getByText("Check recovery-key status")
        );

        await waitFor(() => {
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery key exists."
            );
        });

        fireEvent.press(
            screen.getByText("Reveal stored recovery key")
        );

        await waitFor(() => {
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery key revealed."
            );
        });

        fireEvent.press(
            screen.getByText("I saved the recovery key")
        );

        await waitFor(() => {
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery-key saving confirmed."
            );
        });

        fireEvent.press(
            screen.getByText("Create persistent Archive-v3 backup")
        );

        await waitFor(() => {
            expect(createBackup).toHaveBeenCalledWith(archive);
            expect(screen.getByTestId("debug-result").props.children).toContain(
                "Persistent Archive-v3 backup created."
            );
        });

        fireEvent.press(
            screen.getByText("Restore the persistent backup")
        );

        await waitFor(() => {
            expect(restoreBackupFile).toHaveBeenCalledWith(
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-07"
            );
            expect(Action.importArchive).toHaveBeenCalledWith(
                restoredArchive
            );
            expect(dispatch).toHaveBeenCalledWith({
                action: "import-archive",
                value: restoredArchive,
            });
        });

        expect(screen.getByTestId("debug-result").props.children).toContain(
            "Thoughts verified: 1"
        );
        expect(screen.getByTestId("debug-result").props.children).toContain(
            "Import action dispatched."
        );
    });

    test("does not dispatch when restored thought identities differ", async () => {
        restoreBackupFile.mockResolvedValue({
            thoughts: [
                {
                    uuid: "different-thought",
                },
            ],
        });

        render(<RecoveryKeyWorkflow />);

        fireEvent.press(
            screen.getByText("Check recovery-key status")
        );
        await waitFor(() =>
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery key exists."
            )
        );

        fireEvent.press(
            screen.getByText("Reveal stored recovery key")
        );
        await waitFor(() =>
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery key revealed."
            )
        );

        fireEvent.press(
            screen.getByText("I saved the recovery key")
        );
        await waitFor(() =>
            expect(screen.getByTestId("debug-result").props.children).toBe(
                "Recovery-key saving confirmed."
            )
        );

        fireEvent.press(
            screen.getByText("Create persistent Archive-v3 backup")
        );
        await waitFor(() => {
            expect(createBackup).toHaveBeenCalledTimes(1);
            expect(
                screen.getByTestId("debug-result").props.children
            ).toContain("Persistent Archive-v3 backup created.");
        });

        fireEvent.press(
            screen.getByText("Restore the persistent backup")
        );

        await waitFor(() => {
            expect(screen.getByTestId("debug-result").props.children).toContain(
                "FAILED: restored thought identity mismatch"
            );
        });

        expect(Action.importArchive).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });
});
