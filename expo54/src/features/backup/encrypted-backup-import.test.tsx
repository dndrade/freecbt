import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";
import { ActivityIndicator } from "react-native";
import { SecureBackup } from "@/src";
import { createSecureBackup } from "@/src/platform/backup/secure-backup-runtime";
import { useStyle } from "@/src/hooks/use-style";
import { Action } from "@/src/model";
import * as DocumentPicker from "expo-document-picker";
import { EncryptedBackupImport } from "./encrypted-backup-import";

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn(),
}));

jest.mock("@/src", () => {
  class InvalidBackupArchiveError extends Error {
    constructor(reason: string) {
      super(`invalid backup archive: ${reason}`);
      this.name = "InvalidBackupArchiveError";
    }
  }

  class MissingRecoveryKeyError extends Error {
    constructor() {
      super("secure backup recovery key is unavailable");
      this.name = "MissingRecoveryKeyError";
    }
  }

  return {
    SecureBackup: {
      InvalidBackupArchiveError,
      MissingRecoveryKeyError,
    },
  };
});

jest.mock("@/src/platform/backup/secure-backup-runtime", () => ({
  createSecureBackup: jest.fn(),
}));

jest.mock("@/src/model", () => {
  const actual = jest.requireActual("@/src/model");

  return {
    ...actual,
    Action: {
      ...actual.Action,
      importArchive: jest.fn(),
    },
  };
});

const restoreArchive = jest.fn();
const dispatch = jest.fn();

const restoredArchive = {
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
      <EncryptedBackupImport
          model={model as never}
          dispatch={dispatch}
          style={style}
          translate={translate}
      />
  );
}

function pickedDocument(body: string): DocumentPicker.DocumentPickerResult {
  return {
    canceled: false,
    assets: [
      {
        name: "backup.freecbt",
        uri: "file:///backup.freecbt",
        mimeType: "application/octet-stream",
        size: body.length,
        lastModified: 0,
        file: {
          text: async () => body,
        } as File,
      },
    ],
  };
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

describe("EncryptedBackupImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(createSecureBackup).mockReturnValue({
      getRecoveryKeyStatus: jest.fn(),
      setupRecoveryKey: jest.fn(),
      revealRecoveryKey: jest.fn(),
      exportArchiveV3: jest.fn(),
      restoreArchive,
    });

    jest.mocked(Action.importArchive).mockReturnValue({
      type: "import-archive",
      archive: restoredArchive,
    } as never);
  });

  test("shows the import action without passphrase controls", () => {
    render(<TestHarness />);

    expect(
        screen.getByText("backup_screen.import.file.button")
    ).toBeTruthy();

    expect(screen.queryByTestId("passphrase-entry")).toBeNull();
    expect(screen.queryByTestId("passphrase-confirm")).toBeNull();
  });

  test("canceled document selection does not restore or dispatch", async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    await waitFor(() => {
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
    });

    expect(restoreArchive).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("passes the selected file body to restoreArchive", async () => {
    jest
        .mocked(DocumentPicker.getDocumentAsync)
        .mockResolvedValue(pickedDocument("encrypted-backup"));

    restoreArchive.mockResolvedValue(restoredArchive);

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    await waitFor(() => {
      expect(restoreArchive).toHaveBeenCalledWith("encrypted-backup");
    });
  });

  test("shows a loading indicator while restore is pending", async () => {
    const pending = deferred<typeof restoredArchive>();

    jest
        .mocked(DocumentPicker.getDocumentAsync)
        .mockResolvedValue(pickedDocument("encrypted-backup"));

    restoreArchive.mockReturnValue(pending.promise);

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    await waitFor(() => {
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    await act(async () => {
      pending.resolve(restoredArchive);
      await pending.promise;
    });

    expect(
        screen.getByText("backup_screen.import.success")
    ).toBeTruthy();
  });

  test("successful restore dispatches the imported archive", async () => {
    jest
        .mocked(DocumentPicker.getDocumentAsync)
        .mockResolvedValue(pickedDocument("encrypted-backup"));

    restoreArchive.mockResolvedValue(restoredArchive);

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    await waitFor(() => {
      expect(Action.importArchive).toHaveBeenCalledWith(restoredArchive);
      expect(dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: "import-archive" })
      );
    });

    expect(
        screen.getByText("backup_screen.import.success")
    ).toBeTruthy();
  });

  test("invalid backup displays the structural error", async () => {
    jest
        .mocked(DocumentPicker.getDocumentAsync)
        .mockResolvedValue(pickedDocument("invalid-backup"));

    restoreArchive.mockRejectedValue(
        new SecureBackup.InvalidBackupArchiveError("invalid JSON")
    );

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    expect(
        await screen.findByText("backup_screen.import.structural_error")
    ).toBeTruthy();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("missing or incorrect recovery key displays the decrypt error", async () => {
    jest
        .mocked(DocumentPicker.getDocumentAsync)
        .mockResolvedValue(pickedDocument("encrypted-backup"));

    restoreArchive.mockRejectedValue(
        new SecureBackup.MissingRecoveryKeyError()
    );

    render(<TestHarness />);

    fireEvent.press(
        screen.getByText("backup_screen.import.file.button")
    );

    expect(
        await screen.findByText("backup_screen.import.decrypt_error")
    ).toBeTruthy();

    expect(dispatch).not.toHaveBeenCalled();
  });
});
