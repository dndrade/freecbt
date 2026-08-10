import { cn, useThemeColor } from "heroui-native";
import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{
    scroll?: boolean;
    className?: string;
    contentClassName?: string;
}>;

export function Screen({
                           children,
                           scroll = true,
                           className,
                           contentClassName,
                       }: ScreenProps) {
    const background = useThemeColor("background");
    const content = (
        <View
            className={cn(
                "w-full max-w-3xl self-center px-4 py-4",
                contentClassName
            )}
        >
            {children}
        </View>
    );

    return (
        <SafeAreaView
            className={cn("flex-1", className)}
            style={{ flex: 1, backgroundColor: background }}
        >
            {scroll ? (
                <ScrollView contentContainerClassName="grow">
                    {content}
                </ScrollView>
            ) : (
                content
            )}
        </SafeAreaView>
    );
}
