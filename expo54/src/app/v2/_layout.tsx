import "../../../global.css";
import { AppProvider } from "@/src/view/gateways/app-provider";
import { Slot } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
                <AppProvider>
                    <Slot />
                </AppProvider>
            </HeroUINativeProvider>
        </GestureHandlerRootView>
    );
}