import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Text } from "react-native";
import { screen } from "@testing-library/react-native";
import { AuthGateway } from "@/features/lock/auth-gateway";
import { I18nProvider } from "@/i18n/use-i18n";
import { Settings } from "@/model";
import { renderWithProviders } from "@/tests/support/render";
import { useAuthStore } from "@/features/lock/store/useAuthStore";

afterEach(async () => {
  useAuthStore.getState().lock();
  await AsyncStorage.removeItem(Settings.pincodeKey);
  await SecureStore.deleteItemAsync(Settings.pincodeSecureKey);
});

it("keeps the app locked while migrating a legacy PIN", async () => {
  await AsyncStorage.setItem(Settings.pincodeKey, "1234");

  renderWithProviders(
    <I18nProvider locale="en">
      <AuthGateway>
        <Text>protected content</Text>
      </AuthGateway>
    </I18nProvider>,
  );

  expect(await screen.findByText("FreeCBT is locked")).toBeTruthy();
  expect(screen.queryByText("protected content")).toBeNull();
});
