import { debugLoggingAllows } from "@/src/debug/logging";

type MetadataValue = string | number | boolean | null | undefined;

export type PerformanceMetadata = Readonly<
    Record<string, MetadataValue>
>;

export type MeasurementResult<T> = Readonly<{
    value: T;
    durationMs: number;
}>;

export type MeasurementOptions = Readonly<{
    /**
     * True when a thrown error from this operation is a normal, anticipated
     * outcome, such as AES-GCM authentication failure from a wrong passphrase
     * or tampered ciphertext.
     *
     * Expected failures are visible only at the "debug" log level. They do not
     * expose the underlying error type or message.
     */
    expectedFailure?: boolean;
}>;

const LOG_PREFIX = "[performance]";

function now(): number {
    return globalThis.performance?.now?.() ?? Date.now();
}

function rounded(durationMs: number): number {
    return Number(durationMs.toFixed(1));
}

function assertDevelopment(): void {
    if (!__DEV__) {
        throw new Error(
            "Development performance utilities must not run in production."
        );
    }
}

function logStarted(
    name: string,
    measurementId: string,
    metadata: PerformanceMetadata
): void {
    if (!debugLoggingAllows("debug")) {
        return;
    }

    console.log(`${LOG_PREFIX} ${name} started`, {
        measurementId,
        ...metadata,
    });
}

function logCompleted(
    name: string,
    measurementId: string,
    durationMs: number,
    metadata: PerformanceMetadata
): void {
    if (!debugLoggingAllows("debug")) {
        return;
    }

    console.log(`${LOG_PREFIX} ${name} completed`, {
        measurementId,
        durationMs: rounded(durationMs),
        ...metadata,
    });
}

function logFailed(
    name: string,
    measurementId: string,
    durationMs: number,
    error: unknown,
    metadata: PerformanceMetadata
): void {
    if (!debugLoggingAllows("error")) {
        return;
    }

    console.error(`${LOG_PREFIX} ${name} failed`, {
        measurementId,
        durationMs: rounded(durationMs),
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage:
            error instanceof Error
                ? error.message
                : "Unknown measurement error",
        ...metadata,
    });
}

function logExpectedRejection(
    name: string,
    measurementId: string,
    durationMs: number,
    metadata: PerformanceMetadata
): void {
    if (!debugLoggingAllows("debug")) {
        return;
    }

    console.log(`${LOG_PREFIX} ${name} rejected (expected)`, {
        measurementId,
        durationMs: rounded(durationMs),
        ...metadata,
    });
}

function createMeasurementId(name: string): string {
    return `${name}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

type MeasurementHandle = Readonly<{
    measurementId: string;
    startedAt: number;
}>;

function beginMeasurement(
    name: string,
    metadata: PerformanceMetadata
): MeasurementHandle {
    assertDevelopment();

    const measurementId = createMeasurementId(name);
    const startedAt = now();

    logStarted(name, measurementId, metadata);

    return {
        measurementId,
        startedAt,
    };
}

function completeMeasurement<T>(
    name: string,
    handle: MeasurementHandle,
    value: T,
    metadata: PerformanceMetadata
): MeasurementResult<T> {
    const durationMs = now() - handle.startedAt;

    logCompleted(name, handle.measurementId, durationMs, metadata);

    return {
        value,
        durationMs,
    };
}

function failMeasurement(
    name: string,
    handle: MeasurementHandle,
    error: unknown,
    metadata: PerformanceMetadata,
    options: MeasurementOptions
): never {
    const durationMs = now() - handle.startedAt;

    if (options.expectedFailure) {
        logExpectedRejection(
            name,
            handle.measurementId,
            durationMs,
            metadata
        );
    } else {
        logFailed(
            name,
            handle.measurementId,
            durationMs,
            error,
            metadata
        );
    }

    throw error;
}

/**
 * Measures an asynchronous development operation.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export async function measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata: PerformanceMetadata = {},
    options: MeasurementOptions = {}
): Promise<MeasurementResult<T>> {
    const handle = beginMeasurement(name, metadata);

    try {
        const value = await operation();

        return completeMeasurement(name, handle, value, metadata);
    } catch (error) {
        failMeasurement(name, handle, error, metadata, options);
    }
}

/**
 * Measures a synchronous development operation.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export function measureSync<T>(
    name: string,
    operation: () => T,
    metadata: PerformanceMetadata = {},
    options: MeasurementOptions = {}
): MeasurementResult<T> {
    const handle = beginMeasurement(name, metadata);

    try {
        const value = operation();

        return completeMeasurement(name, handle, value, metadata);
    } catch (error) {
        failMeasurement(name, handle, error, metadata, options);
    }
}

/**
 * Measures an asynchronous operation in development builds.
 *
 * Production builds execute the operation directly and return a zero
 * duration. Logging is controlled independently through DEBUG_LOG_LEVEL.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export async function measureDevelopmentAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata: PerformanceMetadata = {},
    options: MeasurementOptions = {}
): Promise<MeasurementResult<T>> {
    if (__DEV__) {
        return measureAsync(name, operation, metadata, options);
    }

    return {
        value: await operation(),
        durationMs: 0,
    };
}

/**
 * Measures a synchronous operation in development builds.
 *
 * Production builds execute the operation directly and return a zero
 * duration. Logging is controlled independently through DEBUG_LOG_LEVEL.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export function measureDevelopmentSync<T>(
    name: string,
    operation: () => T,
    metadata: PerformanceMetadata = {},
    options: MeasurementOptions = {}
): MeasurementResult<T> {
    if (__DEV__) {
        return measureSync(name, operation, metadata, options);
    }

    return {
        value: operation(),
        durationMs: 0,
    };
}