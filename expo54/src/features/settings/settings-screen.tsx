import { Screen } from "@/src/components";
import { SettingsHeader } from "@/src/components/settings-header";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import React, { useState } from "react";
import { AppearancePicker } from "./ui/appearance-picker";
import { AboutSheet } from "./ui/about-sheet";
import { DataSheet } from "./ui/data-sheet";
import { GeneralSheet } from "./ui/general-sheet";
import { JournalPicker } from "./ui/journal-picker";
import { SettingsCard } from "./ui/settings-card";
import { SettingsRow } from "./ui/settings-row";
import { SupportSheet } from "./ui/support-sheet";
import { WellbeingSheet } from "./ui/wellbeing-sheet";

type OpenPanel = "general" | "appearance" | "journal" | "data" | "wellbeing" | "support" | "about" | null;

export function SettingsScreen(props: ModelLoadedProps) {
  const { model, dispatch, translate: t } = props;
  const [open, setOpen] = useState<OpenPanel>(null);

  function panel(key: Exclude<OpenPanel, null>) {
    return {
      isOpen: open === key,
      onOpenChange: (v: boolean) => setOpen(v ? key : null),
    };
  }

  return (
    <Screen>
      <SettingsHeader title={t("settings.header")} showBack={false} />
      <SettingsCard className="mt-2">
        <SettingsRow
          type="nav"
          iconName="settings"
          iconColor="purple"
          label={t("settings.hub.general.label")}
          onPress={() => setOpen("general")}
        />
        <SettingsRow
          type="nav"
          iconName="moon"
          iconColor="purple"
          label={t("settings.hub.appearance.label")}
          onPress={() => setOpen("appearance")}
        />
        <SettingsRow
          type="nav"
          iconName="tag"
          iconColor="pink"
          label={t("settings.hub.journal.label")}
          onPress={() => setOpen("journal")}
        />
        <SettingsRow
          type="nav"
          iconName="database"
          iconColor="yellow"
          label={t("settings.hub.data.label")}
          description={t("settings.hub.data.description")}
          onPress={() => setOpen("data")}
        />
        <SettingsRow
          type="nav"
          iconName="heart"
          iconColor="pink"
          label={t("settings.hub.wellbeing.label")}
          description={t("settings.hub.wellbeing.description")}
          onPress={() => setOpen("wellbeing")}
        />
        <SettingsRow
          type="nav"
          iconName="headphones"
          iconColor="purple"
          label={t("settings.hub.support.label")}
          description={t("settings.hub.support.description")}
          onPress={() => setOpen("support")}
        />
        <SettingsRow
          type="nav"
          iconName="info"
          iconColor="pink"
          label={t("settings.hub.about.label")}
          onPress={() => setOpen("about")}
        />
      </SettingsCard>

      <GeneralSheet {...panel("general")} model={model} dispatch={dispatch} translate={t} />
      <AppearancePicker {...panel("appearance")} model={model} dispatch={dispatch} translate={t} />
      <JournalPicker {...panel("journal")} model={model} dispatch={dispatch} translate={t} />
      <DataSheet {...panel("data")} translate={t} />
      <WellbeingSheet {...panel("wellbeing")} translate={t} />
      <SupportSheet {...panel("support")} translate={t} />
      <AboutSheet {...panel("about")} translate={t} />
    </Screen>
  );
}
