import { useThemeColor } from "heroui-native";

export function useAppColors() {
    const [
        background,
        foreground,
        accent,
        border,
        muted,
    ] = useThemeColor([
        "background",
        "foreground",
        "accent",
        "border",
        "muted",
    ]);

    return {
        background,
        foreground,
        accent,
        border,
        muted,
    } as const;
}