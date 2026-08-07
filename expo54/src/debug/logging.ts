/**
 * Shared switch for development-only diagnostic logging.
 *
 * Keep disabled for normal development, tests, commits, and CI.
 * Enable temporarily while actively investigating a diagnostic.
 */

export type DebugLogLevel =
    | "off"
    | "error"
    | "warn"
    | "info"
    | "debug";

export const DEBUG_LOG_LEVEL: DebugLogLevel = "error";

const LOG_LEVEL_PRIORITY: Readonly<Record<DebugLogLevel, number>> = {
    off: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
};

/**
 * Returns whether the configured verbosity permits a message at `level`.
 *
 * - off: no diagnostic output
 * - error: unexpected failures only
 * - warn: errors and warnings
 * - debug: all diagnostic and performance output
 */
export function debugLoggingAllows(
    level: Exclude<DebugLogLevel, "off">
): boolean {
    return (
        LOG_LEVEL_PRIORITY[DEBUG_LOG_LEVEL] >= LOG_LEVEL_PRIORITY[level]
    );
}