import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { useStyle } from "@/src/hooks/use-style";
import { PassphraseForm } from "./passphrase-form";

jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

function testTranslate(key: string): string {
  return key;
}
// useStyle() is a hook and can only be called from inside a component, so
// tests render PassphraseForm through this tiny wrapper rather than trying
// to call useStyle() as a plain helper function.
function TestHarness(props: {
  mode: "export" | "import";
  onSubmit: (p: string) => void;
  onCancel: () => void;
}) {
  const style = useStyle("light");
  return (
    <PassphraseForm
      mode={props.mode}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      style={style}
      translate={testTranslate}
    />
  );
}

describe("PassphraseForm export mode", () => {
  function renderExport(onSubmit: (p: string) => void) {
    render(
      <TestHarness mode="export" onSubmit={onSubmit} onCancel={() => {}} />
    );
  }

  test("blocks submit below the 12-code-point minimum", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), "short11ch"); // 9 chars
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), "short11ch");
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("passphrase-error")).toBeTruthy();
  });

  test("counts Unicode code points, not UTF-16 code units", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    // 6 emoji, each a surrogate pair (12 UTF-16 units, but 6 code points) -
    // below the 12-code-point minimum even though .length would read 12
    const sixEmoji = "🎉".repeat(6);
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), sixEmoji);
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), sixEmoji);
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("rejects exactly 11 code points, one below the minimum", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    const eleven = "x".repeat(11);
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), eleven);
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), eleven);
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("accepts exactly 12 code points, the minimum", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    const twelve = "x".repeat(12);
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), twelve);
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), twelve);
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).toHaveBeenCalledWith(twelve);
  });

  test("accepts 13 code points, one above the minimum", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    const thirteen = "x".repeat(13);
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), thirteen);
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), thirteen);
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).toHaveBeenCalledWith(thirteen);
  });

  test("blocks submit on entry/confirmation mismatch", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    fireEvent.changeText(
      screen.getByTestId("passphrase-entry"),
      "a valid twelve-plus code point passphrase"
    );
    fireEvent.changeText(
      screen.getByTestId("passphrase-confirm"),
      "a different valid passphrase 1234"
    );
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("passphrase-error")).toBeTruthy();
  });

  test("submits the exact passphrase as typed, no trimming", () => {
    const onSubmit = jest.fn();
    renderExport(onSubmit);
    const padded = "  padded passphrase twelve+  ";
    fireEvent.changeText(screen.getByTestId("passphrase-entry"), padded);
    fireEvent.changeText(screen.getByTestId("passphrase-confirm"), padded);
    fireEvent.press(screen.getByTestId("passphrase-submit"));
    expect(onSubmit).toHaveBeenCalledWith(padded);
  });

  test("visibility toggle reveals the typed passphrase", () => {
    renderExport(() => {});
    const entry = screen.getByTestId("passphrase-entry");
    expect(entry.props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId("passphrase-visibility-toggle"));
    expect(entry.props.secureTextEntry).toBe(false);
  });
});

describe("PassphraseForm import mode", () => {
  test("has a single field, no confirmation field", () => {
    render(<TestHarness mode="import" onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId("passphrase-entry")).toBeTruthy();
    expect(screen.queryByTestId("passphrase-confirm")).toBeNull();
  });

  test("cancel calls onCancel", () => {
    const onCancel = jest.fn();
    render(<TestHarness mode="import" onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.press(screen.getByTestId("passphrase-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
