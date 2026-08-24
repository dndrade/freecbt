// src/components/Icon/Icon.tsx
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AppIconProps, IconSize, SemanticIconName } from './Icon.types';

const resolveSize = (size: IconSize = 'md'): number => {
    if (typeof size === 'number') return size;
    switch (size) {
        case 'sm': return 16;
        case 'md': return 22;
        case 'lg': return 30;
        default: return 22;
    }
};

type IoniconsGlyph = React.ComponentProps<typeof Ionicons>['name'];

// Map domain names to vendor glyph names
const ICON_MAP: Record<SemanticIconName, IoniconsGlyph> = {
    'chevron-right': 'chevron-forward',
    'chevron-left': 'chevron-back',
    'settings': 'settings-outline',
    'lock': 'lock-closed-outline',
    'unlock': 'lock-open-outline',
    'cloud-backup': 'cloud-upload-outline',
    'note-add': 'create-outline',
    'trash': 'trash-outline',
    'search': 'search-outline',
    'check-circle': 'checkmark-circle-outline',
    'alert-circle': 'alert-circle-outline',
    'bell': 'notifications-outline',
    'globe': 'globe-outline',
    'github': 'logo-github',
    'shield': 'shield-checkmark-outline',
    'code': 'code-slash-outline',
    'close': 'close-outline',
    'more-vertical': 'ellipsis-vertical-outline',
};

export const Icon: React.FC<AppIconProps> = ({
                                                 name,
                                                 size = 'md',
                                                 color = '#F8FAFC',
                                                 testID,
                                             }) => {
    const glyphName = ICON_MAP[name] ?? 'help-outline';
    return (
        <Ionicons
            name={glyphName}
            size={resolveSize(size)}
            color={color}
            testID={testID}
        />
    );
};
