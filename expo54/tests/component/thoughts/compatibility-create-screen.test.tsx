import { DistortionData } from "@/src/model";
import { screen } from "@testing-library/react-native";
import React from "react";
import { CompatibilityCreateScreen } from "@/src/features/thoughts/compatibility-create-screen";
import { renderWithProviders } from "@/tests/support/render";

const model = {
  distortionData: DistortionData,
  thoughtSaveOutbox: [],
  thoughtSaveResult: "idle",
  thoughts: new Map(),
} as any;

const style = {
  text: {},
  flexRow: {},
  h4: {},
  body: {},
  gap1: {},
  rounded: {},
  border: {},
  p2: {},
} as any;

const translate = ((k: string) => k) as any;

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

describe("CompatibilityCreateScreen", () => {
  it("renders a header above the entry form", () => {
    renderWithProviders(
      <CompatibilityCreateScreen model={model} translate={translate} dispatch={jest.fn()} style={style} />
    );

    expect(screen.getByText("cbt_form.new")).toBeTruthy();
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy();
  });
});
