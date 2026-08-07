import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugResult } from "@/src/debug/ui/debug-result";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import {
  ArchiveDecryptError,
  decryptHeader,
  EncryptedHeaderV3,
} from "@/src/model/archive/archive-crypto";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { Platform } from "react-native";

const FIXTURE_KEY = "independent fixture passphrase 123";
const FIXTURE_PLAINTEXT = JSON.stringify({ thoughts: [] });

const FIXTURE: EncryptedHeaderV3 = {
  v: "Archive-v3",
  kdf: "PBKDF2-SHA256",
  paramsVersion: 1,
  iterations: 600_000,
  salt: "AQIDBAUGBwgJCgsMDQ4PEA==",
  nonce: "EBESExQVFhcYGRob",
  ciphertext: "O2E5Mejqeutn3i+YrjTwOWTPX6YIeIgJVT6NVSwTng==",
};

export default function ArchiveCryptoDiagnostics() {
  if (!__DEV__) {
    return <Redirect href="/v2" />;
  }

  return <Ready />;
}

function Ready() {
  const [result, setResult] = useState("No diagnostic run yet.");
  const [running, setRunning] = useState(false);
  const isNative =
    Platform.OS === "android" || Platform.OS === "ios";

  async function run(
    message: string,
    diagnostic: () => Promise<string>
  ): Promise<void> {
    setRunning(true);
    setResult(message);

    try {
      if (!isNative) {
        setResult(`Skipped on ${Platform.OS}. Android or iOS required.`);
        return;
      }

      setResult(await diagnostic());
    } catch (error) {
      setResult(describeError(error));
    } finally {
      setRunning(false);
    }
  }

  async function decryptFixture(): Promise<string> {
    const started = performance.now();
    const plaintext = await decryptHeader(FIXTURE_KEY, FIXTURE);
    const durationMs = performance.now() - started;

    if (plaintext !== FIXTURE_PLAINTEXT) {
      throw new Error("Frozen fixture plaintext did not match.");
    }

    return [
      "Independent Archive-v3 fixture passed.",
      `Platform: ${Platform.OS}`,
      `Decrypt: ${durationMs.toFixed(1)} ms`,
    ].join("\n");
  }

  async function rejectWrongKey(): Promise<string> {
    try {
      await decryptHeader(`${FIXTURE_KEY}-wrong`, FIXTURE);
    } catch (error) {
      if (error instanceof ArchiveDecryptError) {
        return [
          "Wrong recovery-key test passed.",
          `Platform: ${Platform.OS}`,
        ].join("\n");
      }

      throw error;
    }

    throw new Error("Wrong recovery key decrypted the fixture.");
  }

  return (
    <DebugScreen
      title="Archive-v3 crypto"
      description={`Verify frozen interoperability and authenticated rejection. Platform: ${Platform.OS}.`}
    >
      <DebugSection title="Native checks">
        <DebugAction
          label="Decrypt frozen Archive-v3 fixture"
          disabled={running || !isNative}
          onPress={() =>
            void run("Decrypting fixture…", decryptFixture)
          }
        />
        <DebugAction
          label="Reject wrong recovery key"
          disabled={running || !isNative}
          onPress={() =>
            void run("Testing wrong key…", rejectWrongKey)
          }
        />
      </DebugSection>

      <DebugResult running={running} value={result} />
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
