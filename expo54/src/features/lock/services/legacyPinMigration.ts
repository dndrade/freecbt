import AsyncStorage from "@react-native-async-storage/async-storage";
import { Settings } from "@/model";
import { getPin, setPin } from "./pinStorage";

export async function migrateLegacyPinIfNeeded(): Promise<void> {
  const legacy = await AsyncStorage.getItem(Settings.pincodeKey);
  if (legacy === null) return;

  if ((await getPin()) !== null) {
    await AsyncStorage.removeItem(Settings.pincodeKey);
    return;
  }

  try {
    await setPin(legacy);
    await AsyncStorage.removeItem(Settings.pincodeKey);
  } catch {
    // Keep legacy data available for a later recovery attempt.
    throw new Error("Unable to migrate legacy PIN");
  }
}
