import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Settings } from "@/model";

export async function getPin(): Promise<string | null> {
  const secure = await SecureStore.getItemAsync(Settings.pincodeSecureKey);
  if (secure !== null) return secure;

  const legacy = await AsyncStorage.getItem(Settings.pincodeKey);
  if (legacy !== null) {
    try {
      await SecureStore.setItemAsync(Settings.pincodeSecureKey, legacy);
      await AsyncStorage.removeItem(Settings.pincodeKey);
    } catch {
      // Keep the legacy PIN so a later successful SecureStore write can migrate it.
    }
  }
  return legacy;
}

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(Settings.pincodeSecureKey, pin);
  await AsyncStorage.removeItem(Settings.pincodeKey);
}

export async function removePin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(Settings.pincodeSecureKey),
    AsyncStorage.removeItem(Settings.pincodeKey),
  ]);
}
