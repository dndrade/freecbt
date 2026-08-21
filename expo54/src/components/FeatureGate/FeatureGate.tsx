import React from 'react';
import { useFeatureFlagStore, type FeatureFlags } from '@/services';

export interface FeatureGateProps {
    flag: keyof FeatureFlags;
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
                                                            flag,
                                                            fallback = null,
                                                            children,
                                                        }) => {
    const isEnabled = useFeatureFlagStore((state) => state.flags[flag]);

    if (!isEnabled) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};