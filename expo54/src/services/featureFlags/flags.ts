export interface FeatureFlags {
    enable_encrypted_cloud_backup: boolean;
    enable_passphrase_otp_login: boolean;
    enable_v3_rich_editor: boolean;
    enable_debug_tools: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
    enable_encrypted_cloud_backup: false,
    enable_passphrase_otp_login: false,
    enable_v3_rich_editor: false,
    enable_debug_tools: __DEV__, // Automatically true in local development
};