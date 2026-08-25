import {
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import { toCSV, toMarkdown } from "./export-format";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Typography } from "heroui-native";
import { useThoughtHistory } from "../thoughtRecord/hooks/useThoughtHistory";

export function ExportScreen(): React.ReactNode {
  const s = useDefaultStyle();
  const t = useTranslate();
  const history = useThoughtHistory();
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
        {history.isLoading ? (
          <ActivityIndicator />
        ) : history.error ? (
          <Typography type="body-sm" className="text-danger">
            {history.error.message}
          </Typography>
        ) : (
          <>
            <MarkdownLink thoughts={history.thoughts} />
            <CSVLink thoughts={history.thoughts} />
          </>
        )}
      </View>
    </StandardScreen>
  );
}

function MarkdownLink(props: {
  thoughts: Parameters<typeof toMarkdown>[0]["thoughts"];
}) {
  const s = useDefaultStyle();
  const t = useTranslate();
  const { thoughts } = props;
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

function CSVLink(props: { thoughts: Parameters<typeof toCSV>[0] }) {
  const s = useDefaultStyle();
  const t = useTranslate();
  const { thoughts } = props;
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
