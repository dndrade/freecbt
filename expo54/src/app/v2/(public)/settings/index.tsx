import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import {
  SettingsHeader,
  SettingsCard,
  SettingsRow,
  GeneralSheet,
  AppearancePicker,
  JournalPicker,
  DataSheet,
  WellbeingSheet,
  SupportSheet,
  AboutSheet,
} from "@/src/components/settings";
import React, { useState } from "react";

type OpenPanel =
  | "general"
  | "appearance"
  | "journal"
  | "data"
  | "wellbeing"
  | "support"
  | "about"
  | null;

export default function Index() {
  return <LoadModel ready={Ready} />;
}

function Ready(props: ModelLoadedProps) {
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
      <SettingsHeader title={t("settings.header")} />
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
          type="collapsed"
          iconName="database"
          iconColor="yellow"
          description={t("settings.hub.data.description")}
          onPress={() => setOpen("data")}
        />
        <SettingsRow
          type="collapsed"
          iconName="heart"
          iconColor="pink"
          description={t("settings.hub.wellbeing.description")}
          onPress={() => setOpen("wellbeing")}
        />
        <SettingsRow
          type="collapsed"
          iconName="headphones"
          iconColor="purple"
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
