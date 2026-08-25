import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Settings } from "@/model";
import { hasPin } from "@/features/lock/services/pinStorage";
import { useAuthStore } from "@/features/lock/store/useAuthStore";

jest.mock("@/features/lock/services/pinStorage", () => {
  const actual = jest.requireActual("@/features/lock/services/pinStorage");
  return { ...actual, hasPin: jest.fn(actual.hasPin) };
});

const initialState = useAuthStore.getState();

beforeEach(async () => {
  jest.clearAllMocks();
  useAuthStore.setState(initialState, true);
  await AsyncStorage.removeItem(Settings.pincodeKey);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

describe("useAuthStore", () => {
  it("starts locked, with no known PIN status", () => {
    expect(useAuthStore.getState()).toMatchObject({
      isUnlocked: false,
      hasPin: false,
      isChecking: false,
    });
  });

  it("checks PIN status after migrating legacy storage", async () => {
    await AsyncStorage.setItem(Settings.pincodeKey, "1234");
    await useAuthStore.getState().checkPinStatus();

    expect(useAuthStore.getState()).toMatchObject({
      hasPin: true,
      isChecking: false,
    });
    expect(await SecureStore.getItemAsync(Settings.pincodeSecureKey)).toBe(
      "1234",
    );
  });

  it("unlocks only for the matching PIN", async () => {
    await SecureStore.setItemAsync(Settings.pincodeSecureKey, "4242");

    expect(await useAuthStore.getState().verifyPin("0000")).toBe(false);
    expect(useAuthStore.getState().isUnlocked).toBe(false);
    expect(await useAuthStore.getState().verifyPin("4242")).toBe(true);
    expect(useAuthStore.getState().isUnlocked).toBe(true);
  });

  it("stores a PIN and marks the app unlocked", async () => {
    await useAuthStore.getState().setPin("1357");

    expect(useAuthStore.getState()).toMatchObject({
      hasPin: true,
      isUnlocked: true,
    });
    expect(await SecureStore.getItemAsync(Settings.pincodeSecureKey)).toBe(
      "1357",
    );
  });

  it("fails closed when PIN storage is unavailable", async () => {
    jest.mocked(hasPin).mockRejectedValueOnce(new Error("unavailable"));
    await useAuthStore.getState().checkPinStatus();

    expect(useAuthStore.getState()).toMatchObject({
      isChecking: false,
      hasPin: true,
      storageError: true,
    });
  });

  it("removes the PIN and unlocks the app", async () => {
    await useAuthStore.getState().setPin("1357");
    await useAuthStore.getState().removePin();

    expect(useAuthStore.getState()).toMatchObject({
      hasPin: false,
      isUnlocked: true,
    });
    expect(
      await SecureStore.getItemAsync(Settings.pincodeSecureKey),
    ).toBeNull();
  });

  it("locks the app", async () => {
    await useAuthStore.getState().setPin("1357");
    useAuthStore.getState().lock();
    expect(useAuthStore.getState().isUnlocked).toBe(false);
  });
});
