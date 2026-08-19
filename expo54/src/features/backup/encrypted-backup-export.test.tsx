import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import React from "react";
import { ActivityIndicator } from "react-native";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import { useStyle } from "@/src/hooks/use-style";
import { Model } from "@/src/model";
import { EncryptedBackupExport } from "./encrypted-backup-export";

jest.mock("@/src/platform/backup/secure-backup-runtime", () => ({
    createSecureBackup: jest.fn(),
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

const createBackup = jest.fn();
const revealRecoveryKey = jest.fn();
const exportArchiveV3 = jest.fn();

const archive = {
    thoughts: [],
};

const model = {
    distortionData: {},
};

function translate(key: string): string {
    return key;
}

function TestHarness() {
    const style = useStyle("light");

    return (
        <EncryptedBackupExport
            model={model as never}
            style={style}
            translate={translate}
        />
    );
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

describe("EncryptedBackupExport", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jest.mocked(createSecureBackup).mockReturnValue({
            getRecoveryKeyStatus: jest.fn(),
            setupRecoveryKey: jest.fn(),
            revealRecoveryKey,
            exportArchiveV3,
            restoreArchive: jest.fn(),
            createBackup,
            restoreBackupFile: jest.fn(),
        });

        jest.mocked(Model.toArchive).mockReturnValue(archive as never);
    });

    test("shows the initial export action without passphrase controls", () => {
        render(<TestHarness />);

        expect(
            screen.getByText("backup_screen.export.share.button")
        ).toBeTruthy();

        expect(screen.queryByTestId("passphrase-entry")).toBeNull();
        expect(screen.queryByTestId("passphrase-confirm")).toBeNull();
    });

    test("pressing export passes Model.toArchive(model) to createBackup", async () => {
        createBackup.mockResolvedValue({
            fileUri: "file:///backups/FreeCBT-backup-test",
            filename: "FreeCBT-backup-test",
        });

        revealRecoveryKey.mockResolvedValue("a1".repeat(32));

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        await waitFor(() => {
            expect(Model.toArchive).toHaveBeenCalledWith(model);
            expect(createBackup).toHaveBeenCalledWith(archive);
        });
    });

    test("shows a loading indicator while backup creation is pending", async () => {
        const pending = deferred<{
            fileUri: string;
            filename: string;
        }>();

        createBackup.mockReturnValue(pending.promise);

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        await waitFor(() => {
            expect(
                screen.UNSAFE_getByType(ActivityIndicator)
            ).toBeTruthy();
        });

        await act(async () => {
            pending.resolve({
                fileUri: "file:///backups/FreeCBT-backup-test",
                filename: "FreeCBT-backup-test",
            });
            await pending.promise;
        });
    });

    test("reveals the recovery key after backup creation succeeds", async () => {
        createBackup.mockResolvedValue({
            fileUri: "file:///backups/FreeCBT-backup-test",
            filename: "FreeCBT-backup-test",
        });

        revealRecoveryKey.mockResolvedValue("a1".repeat(32));

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        await waitFor(() => {
            expect(createBackup).toHaveBeenCalledWith(archive);
            expect(revealRecoveryKey).toHaveBeenCalledTimes(1);
        });
    });

    test("shows the recovery key after backup creation succeeds", async () => {
        const recoveryKey = "a1".repeat(32);

        createBackup.mockResolvedValue({
            fileUri: "file:///backups/FreeCBT-backup-test",
            filename: "FreeCBT-backup-test",
        });

        revealRecoveryKey.mockResolvedValue(recoveryKey);

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByText(
                "backup_screen.export.recovery_key.header"
            )
        ).toBeTruthy();

        expect(
            screen.getByText(
                "backup_screen.export.recovery_key.warning"
            )
        ).toBeTruthy();

        expect(
            screen.getByText(
                "backup_screen.export.recovery_key.label"
            )
        ).toBeTruthy();

        expect(screen.getByText(recoveryKey)).toBeTruthy();
    });

    test("shows backup creation success after the file is written", async () => {
        createBackup.mockResolvedValue({
            fileUri: "file:///backups/FreeCBT-backup-test",
            filename: "FreeCBT-backup-test",
        });

        revealRecoveryKey.mockResolvedValue("a1".repeat(32));

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByText("backup_screen.export.success")
        ).toBeTruthy();

        expect(
            screen.getByText("FreeCBT-backup-test")
        ).toBeTruthy();
    });

    test("shows an error when the backup is created but the recovery key cannot be revealed", async () => {
        createBackup.mockResolvedValue({
            fileUri: "file:///backups/FreeCBT-backup-test",
            filename: "FreeCBT-backup-test",
        });

        revealRecoveryKey.mockRejectedValue(
            new Error("recovery key unavailable")
        );

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByText(
                "backup_screen.export.recovery_key.unavailable"
            )
        ).toBeTruthy();

        expect(createBackup).toHaveBeenCalledWith(archive);
        expect(revealRecoveryKey).toHaveBeenCalledTimes(1);
    });

    test("failed backup creation displays the existing unavailable message", async () => {
        createBackup.mockRejectedValue(new Error("backup failed"));

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByText(
                "backup_screen.export.share.unavailable"
            )
        ).toBeTruthy();
    });
});
