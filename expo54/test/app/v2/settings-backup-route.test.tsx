import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react-native";
import BackupRoute from "@/src/app/v2/(public)/settings/data/backup/index";
import { BackupSettingsScreen } from "@/src/features/backup/backup-settings-screen";
import BackupLabCurrent from "@/src/app/v2/debug/lab/settings/backup/current";

let lastReady: React.ComponentType<any> | null = null;
const mockLoadModel = jest.fn(
  (props: { ready: React.ComponentType<any> }) => {
    lastReady = props.ready;
    return null;
  }
);

jest.mock("@/src/hooks/use-model", () => ({
  LoadModel: (props: { ready: React.ComponentType<any> }) =>
    mockLoadModel(props),
}));

describe("backup route wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastReady = null;
  });

  it("routes the public Backup settings page through the feature entry point", () => {
    render(<BackupRoute />);

    expect(lastReady).toBe(BackupSettingsScreen);
  });

  it("routes the Lab Backup Current baseline through the same feature entry point", () => {
    render(<BackupLabCurrent />);

    expect(lastReady).toBe(BackupSettingsScreen);
  });

  it("keeps both route files free of direct route-to-route coupling", () => {
    const publicRoute = fs.readFileSync(
      path.join(
        __dirname,
        "../../../src/app/v2/(public)/settings/data/backup/index.tsx"
      ),
      "utf8"
    );
    const labRoute = fs.readFileSync(
      path.join(
        __dirname,
        "../../../src/app/v2/debug/lab/settings/backup/current.tsx"
      ),
      "utf8"
    );

    expect(publicRoute).not.toContain("settings/data/backup/index");
    expect(labRoute).not.toContain("settings/data/backup/index");
  });
});
