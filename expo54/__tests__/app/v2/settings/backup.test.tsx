import {
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import { Ready } from "@/src/app/v2/(public)/settings/data/backup";
import { backupFlags } from "@/src/features/backup/backup-flags";
import {
  ModelProvider,
  useModel,
} from "@/src/hooks/use-model";
import { useStyle } from "@/src/hooks/use-style";

jest.mock(
    "@/src/features/backup/encrypted-backup-export",
    () => ({
      EncryptedBackupExport: () => (
          <Text testID="encrypted-backup-export">
            encrypted backup export
          </Text>
      ),
    })
);

jest.mock(
    "@/src/features/backup/encrypted-backup-import",
    () => ({
      EncryptedBackupImport: () => (
          <Text testID="encrypted-backup-import">
            encrypted backup import
          </Text>
      ),
    })
);

jest.mock(
    "@/src/features/backup/legacy-backup-export",
    () => ({
      LegacyBackupExport: () => (
          <Text testID="legacy-backup-export">
            legacy backup export
          </Text>
      ),
    })
);

jest.mock(
    "@/src/features/backup/legacy-backup-import",
    () => ({
      LegacyBackupImport: () => (
          <Text testID="legacy-backup-import">
            legacy backup import
          </Text>
      ),
    })
);

function translate(key: string): string {
  return key;
}

function ReadyHarness() {
  const [model, dispatch] = useModel();
  const style = useStyle("light");

  if (model.status !== "ready") {
    return null;
  }

  return (
      <Ready
          model={model}
          dispatch={dispatch}
          style={style}
          translate={translate}
      />
  );
}

async function renderReady(): Promise<void> {
  render(
      <ModelProvider>
        <ReadyHarness />
      </ModelProvider>
  );

  await waitFor(() => {
    expect(
        screen.getByText("backup_screen.export.description")
    ).toBeTruthy();
  });
}

function setEncryptedBackupEnabled(value: boolean): void {
  (
      backupFlags as {
        encryptedBackup: boolean;
      }
  ).encryptedBackup = value;
}

describe("Backup route feature selection", () => {
  afterEach(() => {
    setEncryptedBackupEnabled(false);
  });

  test("renders encrypted controls when the rollout flag is enabled", async () => {
    setEncryptedBackupEnabled(true);

    await renderReady();

    expect(
        screen.getByTestId("encrypted-backup-export")
    ).toBeTruthy();
    expect(
        screen.getByTestId("encrypted-backup-import")
    ).toBeTruthy();

    expect(
        screen.queryByTestId("legacy-backup-export")
    ).toBeNull();
    expect(
        screen.queryByTestId("legacy-backup-import")
    ).toBeNull();
  });

  test("renders legacy controls when the rollout flag is disabled", async () => {
    setEncryptedBackupEnabled(false);

    await renderReady();

    expect(
        screen.getByTestId("legacy-backup-export")
    ).toBeTruthy();
    expect(
        screen.getByTestId("legacy-backup-import")
    ).toBeTruthy();

    expect(
        screen.queryByTestId("encrypted-backup-export")
    ).toBeNull();
    expect(
        screen.queryByTestId("encrypted-backup-import")
    ).toBeNull();
  });

  test("keeps the shared route descriptions for both implementations", async () => {
    setEncryptedBackupEnabled(true);

    await renderReady();

    expect(
        screen.getByText("backup_screen.export.description")
    ).toBeTruthy();
    expect(
        screen.getByText("backup_screen.import.description")
    ).toBeTruthy();
  });
});
