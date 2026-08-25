import * as SecureStore from "expo-secure-store";
import { readFileSync } from "fs";
import { Settings } from "@/model";
import {
  getPin,
  hasPin,
  removePin,
  setPin,
} from "@/features/lock/services/pinStorage";

afterEach(async () => {
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

describe("pinStorage", () => {
  it("returns null when no PIN is set", async () => {
    expect(await getPin()).toBeNull();
    expect(await hasPin()).toBe(false);
  });

  it("stores and retrieves a valid 4-digit PIN", async () => {
    await setPin("1234");
    expect(await getPin()).toBe("1234");
    expect(await hasPin()).toBe(true);
  });

  it("rejects PINs that are not exactly 4 digits", async () => {
    await expect(setPin("123")).rejects.toThrow();
    await expect(setPin("12345")).rejects.toThrow();
    await expect(setPin("12a4")).rejects.toThrow();
    expect(await hasPin()).toBe(false);
  });

  it("removes a stored PIN", async () => {
    await setPin("4321");
    await removePin();
    expect(await getPin()).toBeNull();
    expect(await hasPin()).toBe(false);
  });

  it("does not import AsyncStorage", () => {
    const source = readFileSync(
      "src/features/lock/services/pinStorage.ts",
      "utf8",
    );
    expect(source).not.toMatch(/AsyncStorage/);
  });
});
