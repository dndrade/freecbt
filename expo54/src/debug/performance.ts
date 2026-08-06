type MetadataValue = string | number | boolean | null | undefined;

export type PerformanceMetadata = Readonly<
    Record<string, MetadataValue>
>;

export type MeasurementResult<T> = Readonly<{
    value: T;
    durationMs: number;
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

    return { measurementId, startedAt };
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
    metadata: PerformanceMetadata
): never {
    const durationMs = now() - handle.startedAt;

    logFailed(name, handle.measurementId, durationMs, error, metadata);

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
    metadata: PerformanceMetadata = {}
): Promise<MeasurementResult<T>> {
    const handle = beginMeasurement(name, metadata);

    try {
        const value = await operation();

        return completeMeasurement(name, handle, value, metadata);
    } catch (error) {
        failMeasurement(name, handle, error, metadata);
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
    metadata: PerformanceMetadata = {}
): MeasurementResult<T> {
    const handle = beginMeasurement(name, metadata);

    try {
        const value = operation();

        return completeMeasurement(name, handle, value, metadata);
    } catch (error) {
        failMeasurement(name, handle, error, metadata);
    }
}

/**
 * Measures an asynchronous operation in development builds.
 *
 * Production builds execute the operation directly and return a zero
 * duration. Benchmark output therefore remains development-only without
 * changing the caller's API or result.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export async function measureDevelopmentAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata: PerformanceMetadata = {}
): Promise<MeasurementResult<T>> {
    if (__DEV__) {
        return measureAsync(name, operation, metadata);
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
 * duration.
 *
 * Never place passphrases, encryption keys, plaintext journal content,
 * decrypted archives, or complete model objects in metadata.
 */
export function measureDevelopmentSync<T>(
    name: string,
    operation: () => T,
    metadata: PerformanceMetadata = {}
): MeasurementResult<T> {
    if (__DEV__) {
        return measureSync(name, operation, metadata);
    }

    return {
        value: operation(),
        durationMs: 0,
    };
}