import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DebugDrawerContent } from "@/src/debug/ui/debug-drawer-content";

const mockNavigate = jest.fn();
const mockCloseDrawer = jest.fn();
let mockPathname = "/v2/debug/lab";

jest.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  usePathname: () => mockPathname,
}));

function buildProps() {
  return {
    state: { index: 0, routes: [{ key: "lab-1", name: "lab" }] },
    navigation: { closeDrawer: mockCloseDrawer },
    descriptors: {},
  } as unknown as import("@react-navigation/drawer").DrawerContentComponentProps;
}

describe("DebugDrawerContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/v2/debug/lab";
  });

  it("shows exactly the four workspaces plus Return to FreeCBT", () => {
    render(<DebugDrawerContent {...buildProps()} />);

    expect(screen.getByRole("button", { name: "UI/UX Lab" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Feature Diagnostics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tools" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Logic Demos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Return to FreeCBT" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("marks the active workspace as selected from its root route", () => {
    mockPathname = "/v2/debug/diagnostics";
    render(<DebugDrawerContent {...buildProps()} />);

    expect(
      screen.getByRole("button", { name: "Feature Diagnostics", selected: true })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "UI/UX Lab", selected: false })
    ).toBeTruthy();
  });

  it("marks the active workspace as selected from a route nested two levels deep", () => {
    mockPathname = "/v2/debug/diagnostics/backup/recovery-key-workflow";
    render(<DebugDrawerContent {...buildProps()} />);

    expect(
      screen.getByRole("button", { name: "Feature Diagnostics", selected: true })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "UI/UX Lab", selected: false })
    ).toBeTruthy();
  });

  it("navigates via typed Expo Router calls and closes the drawer", () => {
    render(<DebugDrawerContent {...buildProps()} />);

    fireEvent.press(screen.getByRole("button", { name: "Tools" }));

    expect(mockNavigate).toHaveBeenCalledWith("/v2/debug/tools");
    expect(mockCloseDrawer).toHaveBeenCalled();
  });

  it("routes Return to FreeCBT to the v2 home screen", () => {
    render(<DebugDrawerContent {...buildProps()} />);

    fireEvent.press(screen.getByRole("button", { name: "Return to FreeCBT" }));

    expect(mockNavigate).toHaveBeenCalledWith("/v2");
    expect(mockCloseDrawer).toHaveBeenCalled();
  });
});
