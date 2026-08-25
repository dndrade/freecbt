import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Settings } from "@/model";
import { setPin } from "@/features/lock/services/pinStorage";
import { migrateLegacyPinIfNeeded } from "@/features/lock/services/legacyPinMigration";

jest.mock("@/features/lock/services/pinStorage", () => {
  const actual = jest.requireActual("@/features/lock/services/pinStorage");
  return { ...actual, setPin: jest.fn(actual.setPin) };
});

afterEach(async () => {
  await AsyncStorage.removeItem(Settings.pincodeKey);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

describe("migrateLegacyPinIfNeeded", () => {
  it("does nothing when no legacy PIN exists", async () => {
    await migrateLegacyPinIfNeeded();
    expect(
      await SecureStore.getItemAsync(Settings.pincodeSecureKey),
    ).toBeNull();
  });

  it("moves a legacy PIN into SecureStore and clears AsyncStorage", async () => {
    await AsyncStorage.setItem(Settings.pincodeKey, "5678");
    await migrateLegacyPinIfNeeded();

    expect(await SecureStore.getItemAsync(Settings.pincodeSecureKey)).toBe(
      "5678",
    );
    expect(await AsyncStorage.getItem(Settings.pincodeKey)).toBeNull();
  });

  it("does not overwrite an existing SecureStore PIN", async () => {
    await SecureStore.setItemAsync(Settings.pincodeSecureKey, "1111");
    await AsyncStorage.setItem(Settings.pincodeKey, "2222");
    await migrateLegacyPinIfNeeded();

    expect(await SecureStore.getItemAsync(Settings.pincodeSecureKey)).toBe(
      "1111",
    );
    expect(await AsyncStorage.getItem(Settings.pincodeKey)).toBeNull();
  });

  it("replaces a malformed SecureStore PIN with a valid legacy PIN", async () => {
    await SecureStore.setItemAsync(Settings.pincodeSecureKey, "invalid");
    await AsyncStorage.setItem(Settings.pincodeKey, "2222");

    await migrateLegacyPinIfNeeded();

    expect(await SecureStore.getItemAsync(Settings.pincodeSecureKey)).toBe(
      "2222",
    );
    expect(await AsyncStorage.getItem(Settings.pincodeKey)).toBeNull();
  });

  it("leaves the legacy value when the SecureStore write fails", async () => {
    await AsyncStorage.setItem(Settings.pincodeKey, "9999");
    jest.mocked(setPin).mockRejectedValueOnce(new Error("unavailable"));

    await expect(migrateLegacyPinIfNeeded()).rejects.toThrow(
      "Unable to migrate legacy PIN",
    );

    expect(await AsyncStorage.getItem(Settings.pincodeKey)).toBe("9999");
  });

  it("does not migrate a malformed legacy PIN", async () => {
    await AsyncStorage.setItem(Settings.pincodeKey, "123456");
    await expect(migrateLegacyPinIfNeeded()).rejects.toThrow(
      "Unable to migrate legacy PIN",
    );

    expect(
      await SecureStore.getItemAsync(Settings.pincodeSecureKey),
    ).toBeNull();
    expect(await AsyncStorage.getItem(Settings.pincodeKey)).toBe("123456");
  });
});
