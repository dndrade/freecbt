import { renderHook, waitFor } from "@testing-library/react-native";
import { ensureThoughtRecordReady } from "@/features/thoughtRecord/services/ensureThoughtRecordReady";
import { useThoughtWizardSession } from "@/features/thoughtRecord/store/useThoughtWizardSession";

const values = new Map<string, string>();
const write = jest.fn<Promise<void>, [unknown]>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));
jest.mock("@/features/thoughtRecord/services/ensureThoughtRecordReady", () => ({
  ensureThoughtRecordReady: jest.fn(),
}));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({
  thoughtsService: jest.fn(() => ({ write })),
}));

const ready = ensureThoughtRecordReady as jest.MockedFunction<
  typeof ensureThoughtRecordReady
>;

afterEach(() => {
  values.clear();
  jest.clearAllMocks();
  useThoughtWizardSession.getState().reset();
});

test("wizard navigation and distortion selection are bounded and reversible", () => {
  const session = useThoughtWizardSession.getState();
  session.prevSlide();
  expect(useThoughtWizardSession.getState().currentSlide).toBe("automatic-thought");
  session.nextSlide();
  session.toggleDistortion("all-or-nothing");
  expect(useThoughtWizardSession.getState().selectedDistortionSlugs).toEqual([
    "all-or-nothing",
  ]);
  session.toggleDistortion("all-or-nothing");
  expect(useThoughtWizardSession.getState().selectedDistortionSlugs).toEqual([]);
});

test("saveRecord returns the saved thought and resets the draft after writing", async () => {
  ready.mockResolvedValueOnce({} as never);
  write.mockResolvedValueOnce();
  useThoughtWizardSession.getState().setAutomaticThought("I made a mistake");

  const result = await useThoughtWizardSession.getState().saveRecord();

  expect(result.status).toBe("saved");
  if (result.status === "saved") {
    expect(result.thought.automaticThought).toBe("I made a mistake");
  }
  expect(write).toHaveBeenCalledTimes(1);
  expect(useThoughtWizardSession.getState()).toMatchObject({
    automaticThought: "",
    isSaving: false,
    error: null,
  });
});

test("saveRecord keeps the draft and error after a write failure", async () => {
  const failure = new Error("write failed");
  ready.mockResolvedValueOnce({} as never);
  write.mockRejectedValueOnce(failure);
  useThoughtWizardSession.getState().setAutomaticThought("keep me");

  const result = await useThoughtWizardSession.getState().saveRecord();

  expect(result).toEqual({ status: "failed" });
  expect(useThoughtWizardSession.getState()).toMatchObject({
    automaticThought: "keep me",
    isSaving: false,
    error: failure,
  });
});

test("saveRecord ignores a duplicate call while a write is pending", async () => {
  let resolveWrite: () => void = () => undefined;
  ready.mockResolvedValueOnce({} as never);
  write.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      })
  );
  useThoughtWizardSession.getState().setAutomaticThought("save once");

  const first = useThoughtWizardSession.getState().saveRecord();
  await waitFor(() => expect(useThoughtWizardSession.getState().isSaving).toBe(true));

  await expect(useThoughtWizardSession.getState().saveRecord()).resolves.toEqual({
    status: "failed",
  });
  expect(write).toHaveBeenCalledTimes(1);

  resolveWrite();
  await first;
});

test("rehydrates an imported Home draft before a consumer renders", async () => {
  values.set(
    "thoughtRecord:wizard-session:v1",
    JSON.stringify({
      state: {
        currentSlide: "challenge",
        automaticThought: "Imported thought",
        selectedDistortionSlugs: ["all-or-nothing"],
        challenge: "A single moment is not everything",
        alternativeThought: "I can learn from this",
      },
      version: 0,
    })
  );

  await useThoughtWizardSession.persist.rehydrate();
  const { result } = renderHook(() => useThoughtWizardSession());

  await waitFor(() =>
    expect(result.current.automaticThought).toBe("Imported thought")
  );
  expect(result.current.currentSlide).toBe("challenge");
});
