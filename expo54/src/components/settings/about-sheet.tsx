import { Routes } from "@/src";
import { TranslateFn } from "@/src/i18n/use-i18n";
import { SettingsCard } from "./settings-card";
import { SettingsRow } from "./settings-row";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "./settings-sheet";
import { Typography } from "heroui-native";
import Constants from "expo-constants";
import { Link } from "expo-router";
import React, { useState } from "react";

const sourceUrl = "https://github.com/erosson/freecbt";

export function AboutSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, translate: t } = props;
  const { dismissThenNavigate, onClosed } = useDismissThenNavigate(onOpenChange);
  const version = Constants.expoConfig?.version ?? "unknown";
  const [presses, setPresses] = useState(0);
  const [showAcknowledgementsTodo, setShowAcknowledgementsTodo] = useState(false);
  const isDebugVisible = presses > 0 && presses % 5 === 0;

  useResetOnDismiss(isOpen, () => {
    setPresses(0);
    setShowAcknowledgementsTodo(false);
  });

  return (
    <SettingsSheet isOpen={isOpen} onOpenChange={onOpenChange} onClosed={onClosed} title={t("settings.about.header")}>
      <SettingsCard className="mt-2">
        <SettingsRow
          type="collapsed"
          iconName="info"
          iconColor="pink"
          description={t("settings.about.version", { version })}
          onPress={() => setPresses(presses + 1)}
        />
        <Link href={sourceUrl as never} target="_blank" asChild>
          <SettingsRow type="nav" iconName="github" iconColor="purple" label={t("settings.about.source.label")} />
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
        <SettingsRow
          type="nav"
          iconName="terminal"
          iconColor="purple"
          label="developer debug page"
          className="mt-3"
          onPress={() => dismissThenNavigate(Routes.debugV2())}
        />
      )}
    </SettingsSheet>
  );
}
