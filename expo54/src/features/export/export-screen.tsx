import {
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Archive, Model } from "@/src/model";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import { toCSV, toMarkdown } from "./export-format";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Typography } from "heroui-native";

export function ExportScreen(props: ModelLoadedProps): React.ReactNode {
  const { style: s, translate: t } = props;
  const router = useRouter();
  useScreenHeader({
    title: t("export_screen.header"),
    leftAction: backHeaderAction(() => router.back()),
  });
  return (
    <StandardScreen>
      <View style={[s.container]} className="mt-2">
        <Typography type="body-sm" className="my-2">
          {t("export_screen.description")}
        </Typography>
        <MarkdownLink {...props} />
        <CSVLink {...props} />
        <JSONLink {...props} />
      </View>
    </StandardScreen>
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
      error={(e) => (
        <Typography type="body-sm" className="text-danger">
          {e}
        </Typography>
      )}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Typography type="body-sm">
            {t("export_screen.markdown.button")}
          </Typography>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Typography type="body-sm">
            {t("export_screen.markdown.button")}
          </Typography>
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
      error={(e) => (
        <Typography type="body-sm" className="text-danger">
          {e}
        </Typography>
      )}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Typography type="body-sm">
            {t("export_screen.csv.button")}
          </Typography>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Typography type="body-sm">
            {t("export_screen.csv.button")}
          </Typography>
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
      error={(e) => (
        <Typography type="body-sm" className="text-danger">
          {e}
        </Typography>
      )}
      share={(onPress) => (
        <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
          <Typography type="body-sm">
            {t("export_screen.json.button")}
          </Typography>
        </TouchableOpacity>
      )}
      download={() => (
        <TouchableOpacity style={[s.button, s.my2]}>
          <Typography type="body-sm">
            {t("export_screen.json.button")}
          </Typography>
        </TouchableOpacity>
      )}
    />
  );
}
