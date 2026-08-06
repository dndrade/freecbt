import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { ModelLoadedProps } from "@/src/hooks/use-model";

const MIN_PASSPHRASE_CODE_POINTS = 12;

function codePointLength(s: string): number {
  return Array.from(s).length;
}

export function PassphraseForm(props: {
  mode: "export" | "import";
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
  style: ModelLoadedProps["style"];
  translate: ModelLoadedProps["translate"];
}) {
  const { mode, onSubmit, onCancel, style: s, translate: t } = props;
  const [entry, setEntry] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmitPress() {
    if (codePointLength(entry) < MIN_PASSPHRASE_CODE_POINTS) {
      setError(t("backup_screen.passphrase.too_short"));
      return;
    }
    if (mode === "export" && entry !== confirm) {
      setError(t("backup_screen.passphrase.mismatch"));
      return;
    }
    setError(null);
    onSubmit(entry);
  }

  return (
    <View style={[s.container]}>
      <Text style={[s.header]}>
        {mode === "export"
          ? t("backup_screen.passphrase.export_header")
          : t("backup_screen.passphrase.import_header")}
      </Text>
      {mode === "export" && (
        <Text style={[s.text, s.my2]}>
          {t("backup_screen.passphrase.export_warning")}
        </Text>
      )}
      <Text style={[s.text]}>{t("backup_screen.passphrase.hint")}</Text>
      <View style={[s.itemsCenter]}>
        <TextInput
          testID="passphrase-entry"
          style={[s.bg, s.border, s.rounded, s.text, s.my2]}
          secureTextEntry={!visible}
          autoFocus={true}
          value={entry}
          onChangeText={setEntry}
        />
        {mode === "export" && (
          <TextInput
            testID="passphrase-confirm"
            style={[s.bg, s.border, s.rounded, s.text, s.my2]}
            secureTextEntry={!visible}
            value={confirm}
            onChangeText={setConfirm}
          />
        )}
        <TouchableOpacity
          testID="passphrase-visibility-toggle"
          onPress={() => setVisible((v) => !v)}
        >
          <Feather name={visible ? "eye-off" : "eye"} size={20} />
        </TouchableOpacity>
      </View>
      {error !== null && (
        <Text testID="passphrase-error" style={[s.errorText]}>
          {error}
        </Text>
      )}
      <TouchableOpacity
        testID="passphrase-submit"
        style={[s.button, s.my2]}
        onPress={onSubmitPress}
      >
        <Text style={[s.buttonText]}>
          {t("backup_screen.passphrase.submit")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity testID="passphrase-cancel" onPress={onCancel}>
        <Text style={[s.text]}>{t("backup_screen.passphrase.cancel")}</Text>
      </TouchableOpacity>
    </View>
  );
}
