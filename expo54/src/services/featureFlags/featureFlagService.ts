import { create } from 'zustand';
import { FeatureFlags, DEFAULT_FLAGS } from './flags';

interface FeatureFlagState {
    flags: FeatureFlags;
    setFlag: (key: keyof FeatureFlags, value: boolean) => void;
    resetFlags: () => void;
    overrideFlags: (overrides: Partial<FeatureFlags>) => void;
}

export const useFeatureFlagStore = create<FeatureFlagState>((set) => ({
    flags: { ...DEFAULT_FLAGS },

    setFlag: (key, value) =>
        set((state) => ({
            flags: { ...state.flags, [key]: value },
        })),

    overrideFlags: (overrides) =>
        set((state) => ({
            flags: { ...state.flags, ...overrides },
        })),

    resetFlags: () =>
        set({
            flags: { ...DEFAULT_FLAGS },
        }),
}));

/**
 * Non-React helper for imperative flag checks
 *  (e.g., inside background tasks or repositories)
 */
export const getFeatureFlag = (key: keyof FeatureFlags): boolean => {
    return useFeatureFlagStore.getState().flags[key];
};