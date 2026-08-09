import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Link } from "expo-router";
import React from "react";

export default function Index() {
  return <LoadModel ready={Ready} />;
}

function Ready({ translate: t }: ModelLoadedProps) {
  return (
    <Screen>
      <SettingsHeader title={t("settings.header")} />
      <SettingsCard className="mt-2">
        <Link href={Routes.generalV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="settings"
            iconColor="purple"
            label={t("settings.hub.general.label")}
          />
        </Link>
        <Link href={Routes.appearanceV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="moon"
            iconColor="purple"
            label={t("settings.hub.appearance.label")}
          />
        </Link>
        <Link href={Routes.journalV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="tag"
            iconColor="pink"
            label={t("settings.hub.journal.label")}
          />
        </Link>
        <Link href={Routes.dataV2()} asChild>
          <SettingsRow
            type="collapsed"
            iconName="database"
            iconColor="yellow"
            description={t("settings.hub.data.description")}
          />
        </Link>
        <Link href={Routes.wellbeingV2()} asChild>
          <SettingsRow
            type="collapsed"
            iconName="heart"
            iconColor="pink"
            description={t("settings.hub.wellbeing.description")}
          />
        </Link>
        <Link href={Routes.supportV2()} asChild>
          <SettingsRow
            type="collapsed"
            iconName="headphones"
            iconColor="purple"
            description={t("settings.hub.support.description")}
          />
        </Link>
        <Link href={Routes.aboutV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="info"
            iconColor="pink"
            label={t("settings.hub.about.label")}
          />
        </Link>
      </SettingsCard>
    </Screen>
  );
}
