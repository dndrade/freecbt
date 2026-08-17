import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { BackupSettingsScreen } from "./backup-settings-screen";
import { backupFlags } from "./backup-flags";

const backupFlagsMock = backupFlags as { encryptedBackup: boolean };

jest.mock("@/src/components", () => ({
  Screen: (props: { children: React.ReactNode }) =>
    React.createElement(View, null, props.children),
}));

jest.mock("@/src/components/settings-header", () => ({
  SettingsHeader: ({ title }: { title: string }) =>
    React.createElement(Text, null, title),
}));

jest.mock("./backup-flags", () => ({
  backupFlags: { encryptedBackup: false },
}));

jest.mock("./encrypted-backup-export", () => ({
  EncryptedBackupExport: () => React.createElement(Text, null, "encrypted-export"),
}));

jest.mock("./encrypted-backup-import", () => ({
  EncryptedBackupImport: () => React.createElement(Text, null, "encrypted-import"),
}));

jest.mock("./legacy-backup-export", () => ({
  LegacyBackupExport: () => React.createElement(Text, null, "legacy-export"),
}));

jest.mock("./legacy-backup-import", () => ({
  LegacyBackupImport: () => React.createElement(Text, null, "legacy-import"),
}));

function renderScreen() {
  return render(
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
    />
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
