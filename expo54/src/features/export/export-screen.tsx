import { Screen } from "@/src/components";
import { SettingsHeader } from "@/src/components/settings/settings-header";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Archive, Model } from "@/src/model";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import { toCSV, toMarkdown } from "./export-format";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export function ExportScreen(props: ModelLoadedProps): React.ReactNode {
  const { style: s, translate: t } = props;
  return (
    <Screen>
      <SettingsHeader title={t("export_screen.header")} />
      <View style={[s.container]} className="mt-2">
        <Text style={[s.text, s.my2]}>{t("export_screen.description")}</Text>
        <MarkdownLink {...props} />
        <CSVLink {...props} />
        <JSONLink {...props} />
      </View>
    </Screen>
  );
}

function MarkdownLink(props: ModelLoadedProps) {
  const { model, style: s, translate: t } = props;
  const thoughts = Model.thoughtsList(model);
  return (
    <DownloadOrShareLink
      name="FreeCBT.md"
      body={() => toMarkdown({ thoughts, translate: t })}
      type="text/markdown"
      UTI="public.text"
      translate={t}
      error={(e) => <Text style={[s.errorText]}>{e}</Text>}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Text style={[s.buttonText]}>
            {t("export_screen.markdown.button")}
          </Text>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Text style={[s.buttonText]}>
            {t("export_screen.markdown.button")}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

function CSVLink(props: ModelLoadedProps) {
  const { model, style: s, translate: t } = props;
  const thoughts = Model.thoughtsList(model);
  return (
    <DownloadOrShareLink
      name="FreeCBT.csv"
      body={() => toCSV(thoughts)}
      type="text/csv"
      UTI="public.comma-separated-values-text"
      translate={t}
      error={(e) => <Text style={[s.errorText]}>{e}</Text>}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Text style={[s.buttonText]}>{t("export_screen.csv.button")}</Text>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Text style={[s.buttonText]}>{t("export_screen.csv.button")}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function JSONLink(props: ModelLoadedProps) {
  const { model, style: s, translate: t } = props;
  const parser = Archive.createParsers(model.distortionData);
  const toArchive = () => parser.fromJson.encode(Model.toArchive(model));
  return (
    <DownloadOrShareLink
      name="FreeCBT.json"
      body={() => JSON.stringify(toArchive())}
      type="application/json"
      UTI="public.json"
      translate={t}
      error={(e) => <Text style={[s.errorText]}>{e}</Text>}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Text style={[s.buttonText]}>{t("export_screen.json.button")}</Text>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Text style={[s.buttonText]}>{t("export_screen.json.button")}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
