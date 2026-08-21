jest.mock("@/services/storage/zustandStorage", () => ({ zustandMmkvStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
jest.mock("@/services/database/client", () => ({ getDatabase: jest.fn(async () => ({})) }));
jest.mock("@/features/thoughtRecord/services/thoughtsService", () => ({ thoughtsService: jest.fn(() => ({ write: jest.fn() })) }));
import { useThoughtWizardSession } from "@/features/thoughtRecord/store/useThoughtWizardSession";
afterEach(() => useThoughtWizardSession.getState().reset());
test("wizard navigation and distortion selection are bounded and reversible", () => { const s = useThoughtWizardSession.getState(); s.prevSlide(); expect(useThoughtWizardSession.getState().currentSlide).toBe("automatic-thought"); s.nextSlide(); s.toggleDistortion("all-or-nothing"); expect(useThoughtWizardSession.getState().selectedDistortionSlugs).toEqual(["all-or-nothing"]); s.toggleDistortion("all-or-nothing"); expect(useThoughtWizardSession.getState().selectedDistortionSlugs).toEqual([]); });
