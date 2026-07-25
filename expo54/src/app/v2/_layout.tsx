import { Slot } from "expo-router";
import { AppProvider } from "@/src/view/app-provider";

export default function Layout() {
  return (
    <AppProvider>
      <Slot />
    </AppProvider>
  );
}
