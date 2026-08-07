import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
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

jest.mock("@/src/platform/sharing/download-or-share", () => ({
    DownloadOrShareLink: (props: { body: () => string }) => (
        <View testID="download-or-share-link">
            <Text testID="encrypted-backup-body">{props.body()}</Text>
        </View>
    ),
}));

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
            revealRecoveryKey: jest.fn(),
            exportArchiveV3,
            restoreArchive: jest.fn(),
            createBackup: jest.fn(),
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

    test("pressing export passes Model.toArchive(model) to exportArchiveV3", async () => {
        exportArchiveV3.mockResolvedValue("encrypted-backup");

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        await waitFor(() => {
            expect(Model.toArchive).toHaveBeenCalledWith(model);
            expect(exportArchiveV3).toHaveBeenCalledWith(archive);
        });
    });

    test("shows a loading indicator while encryption is pending", async () => {
        const pending = deferred<string>();
        exportArchiveV3.mockReturnValue(pending.promise);

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        await waitFor(() => {
            expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
        });

        await act(async () => {
            pending.resolve("encrypted-backup");
            await pending.promise;
        });

        expect(
            screen.getByTestId("download-or-share-link")
        ).toBeTruthy();
    });

    test("successful encryption exposes the prepared backup", async () => {
        exportArchiveV3.mockResolvedValue("encrypted-backup");

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByTestId("download-or-share-link")
        ).toBeTruthy();

        expect(screen.getByTestId("encrypted-backup-body").props.children).toBe(
            "encrypted-backup"
        );
    });

    test("failed encryption displays the existing unavailable message", async () => {
        exportArchiveV3.mockRejectedValue(new Error("encryption failed"));

        render(<TestHarness />);

        fireEvent.press(
            screen.getByText("backup_screen.export.share.button")
        );

        expect(
            await screen.findByText("backup_screen.export.share.unavailable")
        ).toBeTruthy();

        expect(screen.queryByTestId("download-or-share-link")).toBeNull();
    });
});
