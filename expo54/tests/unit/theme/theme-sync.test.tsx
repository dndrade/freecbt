import { render, waitFor } from "@testing-library/react-native";

const mockUseModel = jest.fn();
const mockSetTheme = jest.fn();

jest.mock("@/src/hooks/use-model", () => ({ useModel: () => mockUseModel() }));
jest.mock("uniwind", () => ({ Uniwind: { setTheme: mockSetTheme } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThemeSync } = require("@/shared/theme/theme-sync");

beforeEach(() => {
  mockSetTheme.mockClear();
});

it.each([
  [{ status: "loading" }, "system"],
  [{ status: "ready", settings: { theme: null } }, "system"],
  [{ status: "ready", settings: { theme: "light" } }, "light"],
  [{ status: "ready", settings: { theme: "dark" } }, "dark"],
])("maps model state to %s", async (model, expectedTheme) => {
  mockUseModel.mockReturnValue([model, jest.fn()]);
  render(<ThemeSync />);
  await waitFor(() => expect(mockSetTheme).toHaveBeenCalledWith(expectedTheme));
});
