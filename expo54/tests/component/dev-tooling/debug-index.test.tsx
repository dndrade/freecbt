import React from "react";
import { render } from "@testing-library/react-native";
import DebugIndex from "@/src/app/v2/debug/index";

const RedirectMock = jest.fn((_props: { href: string }) => null);

jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => RedirectMock(props),
}));

describe("debug index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to the default workspace instead of showing a menu", () => {
    render(<DebugIndex />);

    expect(RedirectMock).toHaveBeenCalledWith({ href: "/v2/debug/lab" });
  });
});
