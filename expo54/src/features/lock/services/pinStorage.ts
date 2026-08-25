import * as SecureStore from "expo-secure-store";
import { Settings } from "@/model";

const PIN_PATTERN = /^[0-9]{4}$/;

export async function getPin(): Promise<string | null> {
  return SecureStore.getItemAsync(Settings.pincodeSecureKey);
}

export async function setPin(pin: string): Promise<void> {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }
  await SecureStore.setItemAsync(Settings.pincodeSecureKey, pin);
}

export async function removePin(): Promise<void> {
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
}

export async function hasPin(): Promise<boolean> {
  return (await getPin()) !== null;
}
