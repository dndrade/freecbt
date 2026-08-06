import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Archive, Model } from "@/src/model";
import {
    ArchiveDecryptError,
    decryptHeader,
    encryptJson,
    validateHeaderV3,
} from "@/src/model/archive/archive-crypto";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LOG_PREFIX = "[encrypted-backup-diagnostics]";

function log(step: string, details?: Record<string, unknown>) {
    if (details) {
        console.log(`${LOG_PREFIX} ${step}`, details);
    } else {
        console.log(`${LOG_PREFIX} ${step}`);
    }
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

export default function EncryptedBackupDiagnostics() {
    if (!__DEV__) {
        return <Redirect href="/v2" />;
    }

    log("route rendered");
    return <LoadModel ready={Ready} />;
}

function Ready(props: ModelLoadedProps) {
    const { model, style: s } = props;

    const [passphrase, setPassphrase] = useState(
        "correct horse battery staple"
    );
    const [result, setResult] = useState("No diagnostic run yet.");
    const [running, setRunning] = useState(false);

    const parser = Archive.createParsers(model.distortionData);

    async function runRoundTrip() {
        const runId = Date.now();

        log("round-trip requested", { runId });
        setRunning(true);
        setResult("Running encrypted round-trip…");

        // Allow React Native to paint the running state before PBKDF2 begins.
        await yieldToUI();

        try {
            log("creating archive from current model", { runId });

            const archive = Model.toArchive(model);
            const originalCount = archive.thoughts.length;

            log("archive created", {
                runId,
                thoughtCount: originalCount,
            });

            log("encoding archive as Archive-v2 JSON", { runId });

            const archiveJson = parser.fromJson.encode(archive);
            const plaintextJson = JSON.stringify(archiveJson);

            log("archive JSON encoded", {
                runId,
                jsonCharacters: plaintextJson.length,
            });

            log("starting Archive-v3 encryption", { runId });

            const encryptStarted = performance.now();
            const header = await encryptJson(passphrase, plaintextJson);
            const encryptMs = performance.now() - encryptStarted;

            log("Archive-v3 encryption complete", {
                runId,
                encryptMs: Number(encryptMs.toFixed(1)),
                paramsVersion: header.paramsVersion,
                iterations: header.iterations,
                saltCharacters: header.salt.length,
                nonceCharacters: header.nonce.length,
                ciphertextCharacters: header.ciphertext.length,
            });

            log("validating encrypted header", { runId });

            const validation = validateHeaderV3(header);

            if (!validation.ok) {
                log("header validation failed", {
                    runId,
                    reason: validation.reason,
                });

                setResult(`Header validation failed: ${validation.reason}`);
                return;
            }

            log("header validation passed", {
                runId,
                version: validation.header.v,
                paramsVersion: validation.header.paramsVersion,
            });

            log("starting Archive-v3 decryption", { runId });

            const decryptStarted = performance.now();
            const decryptedJson = await decryptHeader(
                passphrase,
                validation.header
            );
            const decryptMs = performance.now() - decryptStarted;

            log("Archive-v3 decryption complete", {
                runId,
                decryptMs: Number(decryptMs.toFixed(1)),
                decryptedCharacters: decryptedJson.length,
            });

            log("parsing decrypted JSON", { runId });

            const parsedJson: unknown = JSON.parse(decryptedJson);

            log("decoding decrypted archive", { runId });

            const decodedArchive = parser.fromJson.decode(parsedJson);
            const decodedCount = decodedArchive.thoughts.length;

            log("decrypted archive decoded", {
                runId,
                originalThoughtCount: originalCount,
                decodedThoughtCount: decodedCount,
            });

            if (decodedCount !== originalCount) {
                const message =
                    `FAILED: thought count changed from ` +
                    `${originalCount} to ${decodedCount}.`;

                log("round-trip comparison failed", {
                    runId,
                    originalThoughtCount: originalCount,
                    decodedThoughtCount: decodedCount,
                });

                setResult(message);
                return;
            }

            log("round-trip passed", {
                runId,
                thoughtCount: decodedCount,
                encryptMs: Number(encryptMs.toFixed(1)),
                decryptMs: Number(decryptMs.toFixed(1)),
            });

            setResult(
                [
                    "Round-trip passed.",
                    `Thoughts: ${originalCount} → ${decodedCount}`,
                    `Encrypt: ${encryptMs.toFixed(1)} ms`,
                    `Decrypt: ${decryptMs.toFixed(1)} ms`,
                ].join("\n")
            );
        } catch (error) {
            logError("round-trip failed", error);
            setResult(describeError(error));
        } finally {
            log("round-trip finished", { runId });
            setRunning(false);
        }
    }

    async function testWrongPassphrase() {
        const runId = Date.now();

        log("wrong-passphrase test requested", { runId });
        setRunning(true);
        setResult("Running wrong-passphrase test…");

        await yieldToUI();

        try {
            log("creating source archive", { runId });

            const archive = Model.toArchive(model);
            const archiveJson = parser.fromJson.encode(archive);
            const plaintextJson = JSON.stringify(archiveJson);

            log("encrypting source archive", {
                runId,
                thoughtCount: archive.thoughts.length,
                jsonCharacters: plaintextJson.length,
            });

            const encryptStarted = performance.now();
            const header = await encryptJson(passphrase, plaintextJson);
            const encryptMs = performance.now() - encryptStarted;

            log("source archive encrypted", {
                runId,
                encryptMs: Number(encryptMs.toFixed(1)),
                ciphertextCharacters: header.ciphertext.length,
            });

            log("attempting decryption with intentionally wrong passphrase", {
                runId,
            });

            const decryptStarted = performance.now();

            await decryptHeader(`${passphrase}-wrong`, header);

            const decryptMs = performance.now() - decryptStarted;

            log("SECURITY FAILURE: wrong passphrase decrypted archive", {
                runId,
                decryptMs: Number(decryptMs.toFixed(1)),
            });

            setResult("FAILED: wrong passphrase unexpectedly decrypted.");
        } catch (error) {
            if (error instanceof ArchiveDecryptError) {
                log("wrong passphrase rejected as expected", {
                    runId,
                    errorType: error.name,
                });

                setResult("Wrong-passphrase test passed.");
            } else {
                logError("wrong-passphrase test failed unexpectedly", error);
                setResult(describeError(error));
            }
        } finally {
            log("wrong-passphrase test finished", { runId });
            setRunning(false);
        }
    }

    function testLegacyArchive() {
        const runId = Date.now();

        log("legacy Archive-v2 test requested", { runId });
        setResult("Running legacy Archive-v2 test…");

        try {
            log("creating current model archive", { runId });

            const archive = Model.toArchive(model);

            log("encoding plaintext Archive-v2 envelope", {
                runId,
                thoughtCount: archive.thoughts.length,
            });

            const legacyText = parser.fromString.encode(archive);

            log("Archive-v2 envelope encoded", {
                runId,
                encodedCharacters: legacyText.length,
            });

            log("decoding Archive-v2 envelope", { runId });

            const decoded = parser.fromString.decode(legacyText);

            log("legacy Archive-v2 test passed", {
                runId,
                originalThoughtCount: archive.thoughts.length,
                decodedThoughtCount: decoded.thoughts.length,
            });

            setResult(
                [
                    "Legacy Archive-v2 test passed.",
                    `Thoughts: ${decoded.thoughts.length}`,
                ].join("\n")
            );
        } catch (error) {
            logError("legacy Archive-v2 test failed", error);
            setResult(describeError(error));
        } finally {
            log("legacy Archive-v2 test finished", { runId });
        }
    }

    return (
        <SafeAreaView style={[s.view]}>
            <View style={[s.container]}>
                <Text style={[s.text, s.my2]}>
                    Encrypted backup diagnostics
                </Text>

                <Text style={[s.text]}>
                    Development only. This tool does not replace stored data.
                </Text>

                <TextInput
                    style={[s.textInput, s.my2]}
                    value={passphrase}
                    onChangeText={(value) => {
                        // Never log the passphrase or its contents.
                        log("diagnostic passphrase changed", {
                            isEmpty: value.length === 0,
                        });
                        setPassphrase(value);
                    }}
                    placeholder="Diagnostic passphrase"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                <DiagnosticButton
                    label="Run encrypted round-trip"
                    disabled={running || passphrase.length === 0}
                    onPress={() => {
                        log("round-trip button pressed");
                        void runRoundTrip();
                    }}
                />

                <DiagnosticButton
                    label="Test wrong passphrase"
                    disabled={running || passphrase.length === 0}
                    onPress={() => {
                        log("wrong-passphrase button pressed");
                        void testWrongPassphrase();
                    }}
                />

                <DiagnosticButton
                    label="Test legacy Archive-v2"
                    disabled={running}
                    onPress={() => {
                        log("legacy Archive-v2 button pressed");
                        testLegacyArchive();
                    }}
                />

                <Text style={[s.text, s.my2]}>
                    {running ? "Running…" : result}
                </Text>
            </View>
        </SafeAreaView>
    );
}

function DiagnosticButton(props: {
    label: string;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Button
            title={props.label}
            disabled={props.disabled}
            onPress={props.onPress}
        />
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