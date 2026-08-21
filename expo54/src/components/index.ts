export { Section } from "@/components/Layout/section";
export { SegmentedProgress } from "./segmented-progress";
export { DotsProgress } from "./dots-progress";
export { FlowAction } from "./flow/flow-action";
export { FlowProgress } from "./flow/flow-progress";
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";


// Primitives
export { Button } from './Button';
export type { AppButtonProps, ButtonVariant } from './Button';

export { Card } from './Card';
export type { AppCardProps } from './Card';

export { TextInput } from './TextInput';
export type { AppTextInputProps } from './TextInput';

export { OtpInput } from './OtpInput';
export type { AppOtpInputProps } from './OtpInput';

export { Icon } from './Icon';
export type { SemanticIconName, IconSize, AppIconProps } from './Icon';

export { FeatureGate } from './FeatureGate';
export type { FeatureGateProps } from './FeatureGate';

// export { AppThemeProvider } from './AppThemeProvider';

// Layout Archetypes
export {
    StandardScreen,
    ScreenContainer,
    ScreenHeader,
    backHeaderAction,
} from './Layout';
export type {
    StandardScreenProps,
    ScreenContainerProps,
    ScreenHeaderProps,
    HeaderAction,
} from './Layout';
