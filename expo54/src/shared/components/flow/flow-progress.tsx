import { DotsProgress } from "../dots-progress";
import { SegmentedProgress } from "../segmented-progress";

export type FlowProgressProps = {
  variant: "segmented" | "dots";
  currentIndex: number;
  count: number;
  accessibilityLabel: string;
  accessibilityValueText: string;
};

export function FlowProgress({ variant, ...props }: FlowProgressProps) {
  return variant === "dots" ? <DotsProgress {...props} /> : <SegmentedProgress {...props} />;
}
