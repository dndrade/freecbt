import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugResult } from "@/src/debug/ui/debug-result";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { LoadModel } from "@/src/hooks/use-model";
import {
    ArchiveDecryptError,
    decryptHeader,
    EncryptedHeaderV3,
} from "@/src/model/archive/archive-crypto";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { Platform } from "react-native";

const LOG_PREFIX = "[archive-crypto-diagnostics]";

const INDEPENDENT_FIXTURE_PASSPHRASE =
    "independent fixture passphrase 123";

const INDEPENDENT_FIXTURE_PLAINTEXT = JSON.stringify({
    thoughts: [],
});

const INDEPENDENT_FIXTURE: EncryptedHeaderV3 = {
    v: "Archive-v3",
    kdf: "PBKDF2-SHA256",
    paramsVersion: 1,
    iterations: 600_000,
    salt: "AQIDBAUGBwgJCgsMDQ4PEA==",
    nonce: "EBESExQVFhcYGRob",
    ciphertext: "O2E5Mejqeutn3i+YrjTwOWTPX6YIeIgJVT6NVSwTng==",
};

function log(step: string, details?: Record<string, unknown>) {
    if (details) {
        console.log(`${LOG_PREFIX} ${step}`, details);
        return;
    }

    console.log(`${LOG_PREFIX} ${step}`);
}

function logError(step: string, error: unknown) {
    console.error(`${LOG_PREFIX} ${step}`, {
        type: error instanceof Error ? error.name : typeof error,
        message: describeError(error),
    });
}

function yieldToUI(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

export default function ArchiveCryptoDiagnostics() {
    if (!__DEV__) {
        return <Redirect href="/v2" />;
    }

    return <LoadModel ready={Ready} />;
}

function Ready() {
    const [result, setResult] = useState("No diagnostic run yet.");
    const [running, setRunning] = useState(false);

    const isNative = Platform.OS === "android" || Platform.OS === "ios";

    async function runIndependentFixtureTest() {
        const runId = Date.now();

        log("independent fixture test requested", {
            runId,
            platform: Platform.OS,
        });

        setRunning(true);
        setResult("Decrypting independent Archive-v3 fixture…");

        await yieldToUI();

        try {
            if (!isNative) {
                setResult(
                    `Skipped: this diagnostic requires Android or iOS. Current platform: ${Platform.OS}.`
                );
                return;
            }

            const started = performance.now();

            const plaintext = await decryptHeader(
                INDEPENDENT_FIXTURE_PASSPHRASE,
                INDEPENDENT_FIXTURE
            );

            const durationMs = performance.now() - started;

            if (plaintext !== INDEPENDENT_FIXTURE_PLAINTEXT) {
                log("independent fixture plaintext mismatch", {
                    runId,
                    platform: Platform.OS,
                    durationMs: Number(durationMs.toFixed(1)),
                    expectedCharacters: INDEPENDENT_FIXTURE_PLAINTEXT.length,
                    actualCharacters: plaintext.length,
                });

                setResult(
                    [
                        "FAILED: independent fixture plaintext did not match.",
                        `Platform: ${Platform.OS}`,
                        `Decrypt: ${durationMs.toFixed(1)} ms`,
                    ].join("\n")
                );
                return;
            }

            log("independent fixture test passed", {
                runId,
                platform: Platform.OS,
                durationMs: Number(durationMs.toFixed(1)),
                plaintextCharacters: plaintext.length,
            });

            setResult(
                [
                    "Independent fixture test passed.",
                    `Platform: ${Platform.OS}`,
                    `Decrypt: ${durationMs.toFixed(1)} ms`,
                ].join("\n")
            );
        } catch (error) {
            logError("independent fixture test failed", error);
            setResult(describeError(error));
        } finally {
            log("independent fixture test finished", {
                runId,
                platform: Platform.OS,
            });

            setRunning(false);
        }
    }

    async function runWrongPassphraseTest() {
        const runId = Date.now();

        log("wrong-passphrase fixture test requested", {
            runId,
            platform: Platform.OS,
        });

        setRunning(true);
        setResult("Testing wrong-passphrase rejection…");

        await yieldToUI();

        try {
            if (!isNative) {
                setResult(
                    `Skipped: this diagnostic requires Android or iOS. Current platform: ${Platform.OS}.`
                );
                return;
            }

            const started = performance.now();

            await decryptHeader(
                `${INDEPENDENT_FIXTURE_PASSPHRASE}-wrong`,
                INDEPENDENT_FIXTURE
            );

            const durationMs = performance.now() - started;

            log("security failure: wrong passphrase decrypted fixture", {
                runId,
                platform: Platform.OS,
                durationMs: Number(durationMs.toFixed(1)),
            });

            setResult(
                [
                    "FAILED: wrong passphrase unexpectedly decrypted the fixture.",
                    `Platform: ${Platform.OS}`,
                    `Decrypt: ${durationMs.toFixed(1)} ms`,
                ].join("\n")
            );
        } catch (error) {
            if (error instanceof ArchiveDecryptError) {
                log("wrong passphrase rejected as expected", {
                    runId,
                    platform: Platform.OS,
                    errorType: error.name,
                });

                setResult(
                    [
                        "Wrong-passphrase test passed.",
                        `Platform: ${Platform.OS}`,
                    ].join("\n")
                );
                return;
            }

            logError("wrong-passphrase fixture test failed unexpectedly", error);
            setResult(describeError(error));
        } finally {
            log("wrong-passphrase fixture test finished", {
                runId,
                platform: Platform.OS,
            });

            setRunning(false);
        }
    }

    return (
        <DebugScreen
            title="Archive crypto"
            description={`Verify Archive-v3 compatibility using a frozen external fixture. Platform: ${Platform.OS}.`}
        >
            <DebugSection title="Native checks">
                <DebugAction
                    label="Test independent fixture"
                    disabled={running || !isNative}
                    onPress={() => {
                        void runIndependentFixtureTest();
                    }}
                />

                <DebugAction
                    label="Test wrong passphrase"
                    disabled={running || !isNative}
                    onPress={() => {
                        void runWrongPassphraseTest();
                    }}
                />
            </DebugSection>

            <DebugResult
                running={running}
                value={result}
            />
        </DebugScreen>
    );
}

function describeError(error: unknown): string {
    if (error instanceof ArchiveDecryptError) {
        return "Archive decryption failed.";
    }

    if (error instanceof Error) {
        return `Diagnostic failed: ${error.message}`;
    }

    return "Diagnostic failed with an unknown error.";
}