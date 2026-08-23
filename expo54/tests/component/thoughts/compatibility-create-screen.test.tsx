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
const mockSetOptions = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useFocusEffect: (cb: () => void) => {
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

describe("CompatibilityCreateScreen", () => {
  it("sets the native header above the entry form", () => {
    renderWithProviders(
      <CompatibilityCreateScreen
        model={model}
        translate={translate}
        dispatch={jest.fn()}
        style={style}
      />,
    );

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ headerTitle: "cbt_form.new" }),
    );
    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy();
  });
});
