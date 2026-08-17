import { registerDevMenu } from "./register-dev-menu";

jest.mock("expo-dev-client", () => ({
  registerDevMenuItems: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

describe("registerDevMenu", () => {
  const mockRegisterDevMenuItems = jest.requireMock("expo-dev-client")
    .registerDevMenuItems as jest.Mock;
  const mockPush = jest.requireMock("expo-router").router.push as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers the UI/UX Lab as a direct dev menu destination", async () => {
    await registerDevMenu();

    expect(mockRegisterDevMenuItems).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "FreeCBT debug tools",
        callback: expect.any(Function),
      }),
      expect.objectContaining({
        name: "UI/UX Lab",
        callback: expect.any(Function),
      }),
    ]);

    const items = mockRegisterDevMenuItems.mock.calls[0][0];
    items[1].callback();

    expect(mockPush).toHaveBeenCalledWith("/v2/debug/lab");
  });
});
