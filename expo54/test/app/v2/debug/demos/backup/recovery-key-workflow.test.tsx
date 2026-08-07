import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Model } from "@/src/model";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import RecoveryKeyWorkflow from "@/src/app/v2/debug/demos/backup/recovery-key-workflow";

const model = {
    distortionData: {},
};

const archive = {
    thoughts: [],
};

const createBackup = jest.fn();
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
                dispatch={jest.fn()}
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
            filename: "FreeCBT-backup-2026-08-07.json",
            fileUri:
                "file:///documents/FreeCBT-backups/FreeCBT-backup-2026-08-07.json",
        });

        jest.mocked(createSecureBackup).mockReturnValue({
            getRecoveryKeyStatus,
            setupRecoveryKey: jest.fn(),
            revealRecoveryKey,
            exportArchiveV3: jest.fn(),
            restoreArchive: jest.fn(),
            createBackup,
            restoreBackupFile: jest.fn(),
        });

        jest.mocked(Model.toArchive).mockReturnValue(archive as never);
    });

    test("creates and reports the persistent Archive-v3 file", async () => {
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
            expect(revealRecoveryKey).toHaveBeenCalledTimes(1);
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
            expect(Model.toArchive).toHaveBeenCalledWith(model);
            expect(createBackup).toHaveBeenCalledWith(archive);
        });

        expect(screen.getByTestId("debug-result").props.children).toContain(
            "Filename: FreeCBT-backup-2026-08-07.json"
        );
        expect(screen.getByTestId("debug-result").props.children).toContain(
            "URI: file:///documents/FreeCBT-backups/"
        );
    });
});