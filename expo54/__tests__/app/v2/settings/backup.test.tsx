import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { ModelProvider, useModel } from "@/src/hooks/use-model";
import { useStyle } from "@/src/hooks/use-style";
import { Ready } from "@/src/app/v2/(public)/settings/backup";
import {
  EncryptedBackupImport,
} from "@/src/features/backup/encrypted-backup-import";

function testTranslate(key: string): string {
  return key;
}

// Real Model.Ready via ModelProvider/useModel (same mechanism the app
// itself uses), not a fabricated/cast object — avoids the guessed
// `as unknown as Model.Ready` shortcut, at the cost of one `waitFor` per
// test for the provider to reach "ready".
function ReadyHarness() {
  const [model, dispatch] = useModel();
  const style = useStyle("light");
  if (model.status !== "ready") return null;
  return (
    <Ready
      model={model}
      dispatch={dispatch}
      style={style}
      translate={testTranslate}
    />
  );
}

function ImportOnlyHarness() {
  const [model, dispatch] = useModel();
  const style = useStyle("light");
  if (model.status !== "ready") return null;
  return (
      <EncryptedBackupImport
          model={model}
          dispatch={dispatch}
          style={style}
          translate={testTranslate}
      />
  );
}

async function renderReady() {
  render(
    <ModelProvider>
      <ReadyHarness />
    </ModelProvider>
  );
  await waitFor(() => expect(screen.getByTestId("passphrase-entry")).toBeTruthy());
}

async function renderImportOnly() {
  render(
    <ModelProvider>
      <ImportOnlyHarness />
    </ModelProvider>
  );
  await waitFor(() =>
    expect(screen.getByText("backup_screen.import.file.button")).toBeTruthy()
  );
}

// expo-document-picker's native module isn't meaningfully mockable at a
// lower level (no file-picker UI in a Jest environment), and no existing
// mock convention for it exists elsewhere in this codebase — mock
// getDocumentAsync directly, resolving through the web `asset.file.text()`
// branch `pickAndDecode` already supports, per file.
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

function mockPickedFile(body: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require("expo-document-picker");
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
    canceled: false,
    assets: [{ file: { text: async () => body } }],
  });
}

describe("Backup screen export", () => {
  test("export requires a passphrase before showing a share/download button", async () => {
    await renderReady();
    expect(screen.getByTestId("passphrase-entry")).toBeTruthy();
    expect(screen.queryByTestId("backup_screen.export.share.button")).toBeNull();
  });
});

describe("Backup screen import", () => {
  test("a structurally invalid file shows the structural error, no passphrase prompt", async () => {
    await renderImportOnly();
    mockPickedFile("not a valid FreeCBT backup at all");

    fireEvent.press(screen.getByText("backup_screen.import.file.button"));

    await waitFor(() =>
      expect(
        screen.getByText("backup_screen.import.structural_error")
      ).toBeTruthy()
    );
    expect(screen.queryByTestId("passphrase-entry")).toBeNull();
  });

  test("an encrypted file prompts for a passphrase, wrong passphrase shows decrypt_error, right passphrase succeeds", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Archive, DistortionData } = require("@/src/model");
    const A = Archive.createParsers(DistortionData);
    const archive = A.fromJson.decode({ v: "Archive-v1", thoughts: [] });
    const encrypted = await A.encodeEncrypted(archive, "the correct passphrase 123");

    await renderImportOnly();
    mockPickedFile(encrypted);
    fireEvent.press(screen.getByText("backup_screen.import.file.button"));

    await waitFor(() =>
      expect(screen.getByTestId("passphrase-entry")).toBeTruthy()
    );

    fireEvent.changeText(
      screen.getByTestId("passphrase-entry"),
      "the wrong passphrase 456"
    );
    fireEvent.press(screen.getByTestId("passphrase-submit"));

    await waitFor(() =>
      expect(
        screen.getByText("backup_screen.import.decrypt_error")
      ).toBeTruthy()
    );

    // a failed decrypt returns to the plain idle view (file-picker button),
    // not a retry field on the same form — retrying means re-picking the
    // file, which yields a fresh decrypt() closure from decodeFile
    expect(screen.queryByTestId("passphrase-entry")).toBeNull();
    mockPickedFile(encrypted);
    fireEvent.press(screen.getByText("backup_screen.import.file.button"));

    await waitFor(() =>
      expect(screen.getByTestId("passphrase-entry")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByTestId("passphrase-entry"),
      "the correct passphrase 123"
    );
    fireEvent.press(screen.getByTestId("passphrase-submit"));

    await waitFor(() =>
      expect(screen.getByText("backup_screen.import.success")).toBeTruthy()
    );
  });
});
