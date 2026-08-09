import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Typography } from "heroui-native";
import { Link } from "expo-router";
import React, { useState } from "react";

export default function Wellbeing() {
  return <LoadModel ready={Ready} />;
}

function Ready({ translate: t }: ModelLoadedProps) {
  const [showCrisisTodo, setShowCrisisTodo] = useState(false);
  return (
    <Screen>
      <SettingsHeader title={t("settings.wellbeing.header")} />
      <SettingsCard className="mt-2">
        <Link href={Routes.introV2()} asChild>
          <SettingsRow
            type="nav"
            iconName="book-open"
            iconColor="yellow"
            label={t("settings.wellbeing.learn.label")}
            description={t("settings.wellbeing.learn.description")}
          />
        </Link>
        <SettingsRow
          type="nav"
          iconName="phone"
          iconColor="pink"
          label={t("settings.wellbeing.crisis.label")}
          description={t("settings.wellbeing.crisis.description")}
          onPress={() => setShowCrisisTodo(true)}
        />
      </SettingsCard>
      {showCrisisTodo && (
        <Typography type="body-sm" color="muted" className="mt-3 px-1">
          {t("settings.wellbeing.crisis.todo")}
        </Typography>
      )}
    </Screen>
  );
}
