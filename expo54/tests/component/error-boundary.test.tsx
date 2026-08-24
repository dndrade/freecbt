import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

function Bomb(): React.ReactNode {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary fallback={<Text>fallback</Text>}>
        <Text>ok</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText("ok")).toBeTruthy();
  });

  it("renders the fallback and calls onError when a child throws", () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary fallback={<Text>fallback</Text>} onError={onError}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("fallback")).toBeTruthy();
    expect(screen.queryByText("ok")).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("supports a fallback function", () => {
    render(
      <ErrorBoundary fallback={() => <Text>fn-fallback</Text>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("fn-fallback")).toBeTruthy();
  });
});
