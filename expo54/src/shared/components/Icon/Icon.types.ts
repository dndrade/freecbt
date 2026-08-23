export type SemanticIconName =
    | 'chevron-right'
    | 'chevron-left'
    | 'settings'
    | 'lock'
    | 'unlock'
    | 'cloud-backup'
    | 'note-add'
    | 'trash'
    | 'search'
    | 'check-circle'
    | 'alert-circle'
    | 'bell'
    | 'globe'
    | 'github'
    | 'shield'
    | 'code'
    | 'close'
    | 'more-vertical';

export type IconSize = 'sm' | 'md' | 'lg' | number;

export interface AppIconProps {
    name: SemanticIconName;
    size?: IconSize;
    color?: string;
    testID?: string;
}
