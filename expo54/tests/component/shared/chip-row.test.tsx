import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { ChipRow } from "@/shared/components/ChipRow/ChipRow";
import { renderWithProviders as render } from "@/tests/support/render";

test("renders one pressable chip per item and reports which was pressed", () => {
  const onPress = jest.fn();
  render(
    <ChipRow
      items={["one moment doesn't decide the outcome", "I can learn from this"]}
      onPress={onPress}
    />,
  );

  expect(
    screen.getByText("one moment doesn't decide the outcome"),
  ).toBeTruthy();
  fireEvent.press(screen.getByText("I can learn from this"));

  expect(onPress).toHaveBeenCalledWith("I can learn from this");
});
