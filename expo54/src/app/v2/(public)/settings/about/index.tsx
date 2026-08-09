import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Typography } from "heroui-native";
import Constants from "expo-constants";
import { Link } from "expo-router";
import React, { useState } from "react";

const sourceUrl = "https://github.com/erosson/freecbt";

export default function About() {
  return <LoadModel ready={Ready} />;
}

function Ready({ translate: t }: ModelLoadedProps) {
  const version = Constants.expoConfig?.version ?? "unknown";
  const [presses, setPresses] = useState(0);
  const isDebugVisible = presses > 0 && presses % 5 === 0;
  const [showAcknowledgementsTodo, setShowAcknowledgementsTodo] = useState(false);

  return (
    <Screen>
      <SettingsHeader title={t("settings.about.header")} />
      <SettingsCard className="mt-2">
        <SettingsRow
          type="collapsed"
          iconName="info"
          iconColor="pink"
          description={t("settings.about.version").replace("{{version}}", version)}
          onPress={() => setPresses(presses + 1)}
        />
        <Link href={sourceUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="github"
            iconColor="purple"
            label={t("settings.about.source.label")}
          />
        </Link>
        <SettingsRow
          type="nav"
          iconName="heart"
          iconColor="yellow"
          label={t("settings.about.acknowledgements.label")}
          onPress={() => setShowAcknowledgementsTodo(true)}
        />
      </SettingsCard>
      {showAcknowledgementsTodo && (
        <Typography type="body-sm" color="muted" className="mt-3 px-1">
          {t("settings.about.acknowledgements.todo")}
        </Typography>
      )}
      {isDebugVisible && (
        <Link href={Routes.debugV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="terminal"
            iconColor="purple"
            label="developer debug page"
            className="mt-3"
          />
        </Link>
      )}
    </Screen>
  );
}
