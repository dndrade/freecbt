import Home from "@/app/v2/(public)/(tabs)/index";
import { HomeScreen } from "@/view/screens/HomeScreen";
import { render } from "@testing-library/react-native";

jest.mock("@/view/screens/HomeScreen", () => ({
  HomeScreen: jest.fn(() => null),
}));

test("wires the home tab route to the independent HomeScreen", () => {
  render(<Home />);

  expect(jest.mocked(HomeScreen)).toHaveBeenCalledTimes(1);
});
