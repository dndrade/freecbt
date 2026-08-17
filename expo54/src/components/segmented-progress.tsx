import { cn } from "heroui-native";
import { View } from "react-native";

type SegmentedProgressProps = {
    currentIndex: number;
    count: number;
    accessibilityLabel?: string;
};

export function SegmentedProgress({
    currentIndex,
    count,
    accessibilityLabel,
}: SegmentedProgressProps) {
    return (
        <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{
                min: 1,
                max: count,
                now: currentIndex + 1,
                text: `Step ${currentIndex + 1} of ${count}`,
            }}
            className="flex-row gap-1"
        >
            {Array.from({ length: count }, (_, index) => (
                <View
                    key={index}
                    testID="segmented-progress-segment"
                className={cn(
                        "h-1 flex-1 rounded-full",
                        index < currentIndex
                            ? "bg-accent"
                            : index === currentIndex
                              ? "bg-accent ring-1 ring-accent"
                              : "bg-separator"
                    )}
                />
            ))}
        </View>
    );
}
