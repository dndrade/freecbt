import { SegmentedProgress } from "../segmented-progress";

export type FlowProgressProps = {
  variant: "segmented";
  currentIndex: number;
  count: number;
  accessibilityLabel: string;
};

export function FlowProgress(props: FlowProgressProps) {
  return <SegmentedProgress {...props} />;
}
