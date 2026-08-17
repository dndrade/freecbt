import * as Core from "./index";

describe("core facade", () => {
  it("re-exports the FreeCBT compositions", () => {
    expect(Core.Screen).toBeDefined();
    expect(Core.Section).toBeDefined();
  });

  it("re-exports the approved HeroUI primitive vocabulary", () => {
    const expected = [
      "Button",
      "Card",
      "ListGroup",
      "ScrollShadow",
      "Surface",
      "BottomSheet",
      "Dialog",
      "Popover",
      "Menu",
      "Tabs",
      "Toast",
      "Switch",
      "Checkbox",
      "RadioGroup",
      "Slider",
      "TextField",
      "Input",
      "TextArea",
      "InputOTP",
      "ControlField",
      "Typography",
      "cn",
      "useThemeColor",
    ] as const;

    for (const name of expected) {
      expect((Core as Record<string, unknown>)[name]).toBeDefined();
    }
  });

  it("does not re-export the deprecated Text alias", () => {
    expect((Core as Record<string, unknown>).Text).toBeUndefined();
  });
});
