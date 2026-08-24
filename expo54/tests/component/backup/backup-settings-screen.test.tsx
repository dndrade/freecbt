import React from "react";
import { screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { BackupSettingsScreen } from "@/src/features/backup/backup-settings-screen";
import { backupFlags } from "@/src/features/backup/backup-flags";
import { renderWithProviders } from "@/tests/support/render";

const backupFlagsMock = backupFlags as { encryptedBackup: boolean };

jest.mock("@/shared/components", () => ({
  Screen: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock("@/src/features/backup/backup-flags", () => ({
  backupFlags: { encryptedBackup: false },
}));

jest.mock("@/src/features/backup/encrypted-backup-export", () => ({
  EncryptedBackupExport: () =>
    React.createElement(Text, null, "encrypted-export"),
}));

jest.mock("@/src/features/backup/encrypted-backup-import", () => ({
  EncryptedBackupImport: () =>
    React.createElement(Text, null, "encrypted-import"),
}));

jest.mock("@/src/features/backup/legacy-backup-export", () => ({
  LegacyBackupExport: () => React.createElement(Text, null, "legacy-export"),
}));

jest.mock("@/src/features/backup/legacy-backup-import", () => ({
  LegacyBackupImport: () => React.createElement(Text, null, "legacy-import"),
}));

function renderScreen() {
  return renderWithProviders(
    <BackupSettingsScreen
      model={{ distortionData: {} } as never}
      dispatch={jest.fn()}
      style={
        {
          text: {},
          my2: {},
          button: {},
          buttonText: {},
          errorText: {},
          header: {},
          container: {},
        } as never
      }
      translate={(key: string) => key}
    />,
  );
}

describe("BackupSettingsScreen", () => {
  beforeEach(() => {
    backupFlagsMock.encryptedBackup = false;
  });

  it("renders the current backup composition with the legacy controls", () => {
    renderScreen();

    expect(screen.getByText("nav.backup")).toBeTruthy();
    expect(screen.getByText("backup_screen.export.description")).toBeTruthy();
    expect(screen.getByText("backup_screen.import.description")).toBeTruthy();
    expect(screen.getByText("legacy-export")).toBeTruthy();
    expect(screen.getByText("legacy-import")).toBeTruthy();
    expect(screen.queryByText("encrypted-export")).toBeNull();
    expect(screen.queryByText("encrypted-import")).toBeNull();
  });

  it("switches to the encrypted controls when the feature flag is enabled", () => {
    backupFlagsMock.encryptedBackup = true;

    renderScreen();

    expect(screen.getByText("encrypted-export")).toBeTruthy();
    expect(screen.getByText("encrypted-import")).toBeTruthy();
    expect(screen.queryByText("legacy-export")).toBeNull();
    expect(screen.queryByText("legacy-import")).toBeNull();
  });
});
