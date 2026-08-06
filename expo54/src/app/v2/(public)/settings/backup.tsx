import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action, Archive, Model } from "@/src/model";
import { PassphraseForm } from "@/src/features/backup/passphrase-form";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import {
  BACKUP_EXPORT_FILENAME,
  BACKUP_EXPORT_MIME_TYPE,
  BACKUP_IMPORT_MIME_TYPES,
} from "@/src/platform/sharing/backup-mime";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Backup() {
  return <LoadModel ready={Ready} />;
}
export function Ready(props: ModelLoadedProps) {
  const { model, dispatch, style: s, translate: t } = props;
  return (
    <SafeAreaView style={[s.view]}>
      <View style={[s.container]}>
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.export.description")}
        </Text>
        <ExportLink model={model} style={s} translate={t} />
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.import.description")}
        </Text>
        <ImportButton model={model} dispatch={dispatch} style={s} translate={t} />
      </View>
    </SafeAreaView>
  );
}

type ExportPhase =
  | { phase: "idle" }
  | { phase: "encrypting" }
  | { phase: "ready"; body: string }
  | { phase: "error"; message: string };

function ExportLink(
  props: Pick<ModelLoadedProps, "style" | "translate"> & {
    model: Model.Ready;
  }
) {
  const { style: s, translate: t, model } = props;
  const [state, setState] = useState<ExportPhase>({ phase: "idle" });
  const encodeEncrypted = Archive.createEncodeEncrypted(model.distortionData);

  async function onSubmitPassphrase(passphrase: string) {
    setState({ phase: "encrypting" });
    try {
      const body = await encodeEncrypted(Model.toArchive(model), passphrase);
      setState({ phase: "ready", body });
    } catch {
      setState({
        phase: "error",
        message: t("backup_screen.export.share.unavailable"),
      });
    }
  }

  if (state.phase === "idle") {
    return (
      <PassphraseForm
        mode="export"
        onSubmit={onSubmitPassphrase}
        onCancel={() => {}}
        style={s}
        translate={t}
      />
    );
  }
  if (state.phase === "encrypting") {
    return <ActivityIndicator />;
  }
  if (state.phase === "error") {
    return <Text style={[s.errorText]}>{state.message}</Text>;
  }
  // state.phase === "ready" — the encrypted file body is fixed now, so
  // DownloadOrShareLink's synchronous `body` prop just returns it.
  return (
    <DownloadOrShareLink
      name={BACKUP_EXPORT_FILENAME}
      body={() => state.body}
      type={BACKUP_EXPORT_MIME_TYPE}
      UTI="org.erosson.freecbt.backup"
      translate={t}
      error={(e) => <Text style={[s.errorText]}>{e}</Text>}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Text style={[s.buttonText]}>
            {t("backup_screen.export.share.button")}
          </Text>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Text style={[s.buttonText]}>
            {t("backup_screen.export.file.button")}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

type ImportPhase =
  | { phase: "idle" }
  | {
      phase: "needs-passphrase";
      decrypt: (passphrase: string) => Promise<Archive.Archive>;
    }
  | { phase: "structural-error" }
  | { phase: "decrypt-error" }
  | { phase: "success" }
  | { phase: "noop" };

export function ImportButton(
  props: Pick<ModelLoadedProps, "dispatch" | "style" | "translate" | "model">
) {
  const { style: s, translate: t, dispatch, model } = props;
  const [state, setState] = useState<ImportPhase>({ phase: "idle" });
  const decodeFile = Archive.createDecodeFile(model.distortionData);
  const legacyParsers = Archive.createParsers(model.distortionData);

  async function pickAndDecode() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [...BACKUP_IMPORT_MIME_TYPES],
    });
    if (res.canceled || !res.assets[0]) return;
    const [asset] = res.assets;
    const body =
      // web
      (await asset.file?.text()) ??
      // mobile
      (await new FileSystem.File(asset.uri).text());

    const result = decodeFile(body);
    if (result.kind === "invalid") {
      setState({ phase: "structural-error" });
      return;
    }
    if (result.kind === "encrypted") {
      setState({ phase: "needs-passphrase", decrypt: result.decrypt });
      return;
    }
    // legacy plaintext path — preserve the existing "nothing changed" check
    // (resolved decision: kept for legacy imports only), comparing against
    // a freshly plaintext-encoded current state. This check is
    // intentionally NOT applied to the "encrypted" branch above: an
    // Archive-v3 export is never byte-identical to a prior export even for
    // identical content (fresh salt/nonce every time), so encrypted
    // imports always report plain success, never "nothing changed."
    const currentPlaintext = legacyParsers.fromString.encode(
      Model.toArchive(model)
    );
    if (currentPlaintext.trim() === body.trim()) {
      setState({ phase: "noop" });
      return;
    }
    dispatch(Action.importArchive(result.archive));
    setState({ phase: "success" });
  }

  async function onSubmitImportPassphrase(passphrase: string) {
    if (state.phase !== "needs-passphrase") return;
    try {
      const archive = await state.decrypt(passphrase);
      dispatch(Action.importArchive(archive));
      setState({ phase: "success" });
    } catch {
      setState({ phase: "decrypt-error" });
    }
  }

  if (state.phase === "needs-passphrase") {
    return (
      <PassphraseForm
        mode="import"
        onSubmit={onSubmitImportPassphrase}
        onCancel={() => setState({ phase: "idle" })}
        style={s}
        translate={t}
      />
    );
  }

  return (
    <>
      <TouchableOpacity style={[s.button, s.my2]} onPress={pickAndDecode}>
        <Text style={[s.buttonText]}>
          {t("backup_screen.import.file.button")}
        </Text>
      </TouchableOpacity>
      {state.phase === "structural-error" && (
        <Text style={[s.errorText]}>
          {t("backup_screen.import.structural_error")}
        </Text>
      )}
      {state.phase === "decrypt-error" && (
        <Text style={[s.errorText]}>
          {t("backup_screen.import.decrypt_error")}
        </Text>
      )}
      {state.phase === "success" && (
        <Text style={[s.text]}>{t("backup_screen.import.success")}</Text>
      )}
      {state.phase === "noop" && (
        <Text style={[s.text]}>{t("backup_screen.import.noop")}</Text>
      )}
    </>
  );
}
