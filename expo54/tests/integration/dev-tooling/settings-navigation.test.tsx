import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { readSrcFile } from "@/tests/support/route-manifest";
import SettingsLabIndex from "@/src/app/v2/debug/lab/settings/index";
import MainSettingsCurrent from "@/src/app/v2/debug/lab/settings/main/current";
import PinSetupCurrent from "@/src/app/v2/debug/lab/settings/pin/current";
import BackupSetupCurrent from "@/src/app/v2/debug/lab/settings/backup/current";
import ExportCurrent from "@/src/app/v2/debug/lab/settings/export/current";
import { BackupSettingsScreen } from "@/src/features/backup/backup-settings-screen";
import { ExportScreen } from "@/src/features/export/export-screen";
import { PinUpdateScreen } from "@/src/features/lock/pin-update-screen";
import { SettingsScreen } from "@/src/features/settings/settings-screen";

const mockPush = jest.fn();
let lastReady: React.ComponentType<any> | null = null;
const mockLoadModel = jest.fn((props: { ready: React.ComponentType<any> }) => {
  lastReady = props.ready;
  return null;
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src/hooks/use-model", () => ({
  LoadModel: (props: { ready: React.ComponentType<any> }) =>
    mockLoadModel(props),
}));

describe("settings lab navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastReady = null;
  });

  it("exposes the four settings scenarios from the family page", () => {
    render(<SettingsLabIndex />);

    expect(screen.getByRole("button", { name: "Main Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PIN Setup" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Backup Setup" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.queryByText("Reminders")).toBeNull();
  });

  it("routes each settings scenario to its variant list", () => {
    render(<SettingsLabIndex />);

    fireEvent.press(screen.getByRole("button", { name: "Main Settings" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/settings/main");

    fireEvent.press(screen.getByRole("button", { name: "PIN Setup" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/settings/pin");

    fireEvent.press(screen.getByRole("button", { name: "Backup Setup" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/settings/backup");

    fireEvent.press(screen.getByRole("button", { name: "Export" }));
    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab/settings/export");
  });

  it.each([
    ["Main Settings", MainSettingsCurrent, SettingsScreen, "main/current.tsx"],
    ["PIN Setup", PinSetupCurrent, PinUpdateScreen, "pin/current.tsx"],
    ["Backup Setup", BackupSetupCurrent, BackupSettingsScreen, "backup/current.tsx"],
    ["Export", ExportCurrent, ExportScreen, "export/current.tsx"],
  ] as const)(
    "routes %s Current through the feature entry point",
    (_label, Component, ready, fileSuffix) => {
      render(<Component />);

      expect(mockLoadModel).toHaveBeenCalled();
      expect(lastReady).toBe(ready);

      const currentRoute = readSrcFile(
        `app/v2/debug/lab/settings/${fileSuffix}`
      );
      expect(currentRoute).not.toMatch(/settings\/data\/backup/);
    }
  );

  it("keeps the lab backup current route pointed at the feature layer", () => {
    const route = readSrcFile(
      "app/v2/debug/lab/settings/backup/current.tsx"
    );

    expect(route).toContain("BackupSettingsScreen");
    expect(route).not.toContain("settings/data/backup");
  });
});
