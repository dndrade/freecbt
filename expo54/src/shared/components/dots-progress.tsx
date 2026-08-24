import { cn } from "heroui-native";
import { View } from "react-native";

type DotsProgressProps = {
    currentIndex: number;
    count: number;
    accessibilityLabel?: string;
    accessibilityValueText?: string;
};

export function DotsProgress({
    currentIndex,
    count,
    accessibilityLabel,
    accessibilityValueText,
}: DotsProgressProps) {
    return (
        <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{
                min: 1,
                max: count,
                now: currentIndex + 1,
                text: accessibilityValueText ?? `Step ${currentIndex + 1} of ${count}`,
            }}
            className="flex-row items-center justify-center gap-2"
        >
            {Array.from({ length: count }, (_, index) => (
                <View
                    key={index}
                    testID="dots-progress-dot"
                    className={cn(
                        "rounded-full",
                        index <= currentIndex
                            ? "h-2.5 w-2.5 bg-accent"
                            : "h-2 w-2 border border-separator"
                    )}
                />
            ))}
        </View>
    );
}
