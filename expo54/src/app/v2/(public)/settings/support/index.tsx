import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Screen } from "@/src/components";
import { SettingsHeader, SettingsCard, SettingsRow } from "@/src/components/settings";
import { Link } from "expo-router";
import React from "react";

const helpCenterUrl = "https://freecbt.erosson.org/explanation/?ref=settings";
const issuesUrl = "https://github.com/erosson/freecbt/issues";
const privacyUrl = "https://github.com/erosson/freecbt/blob/master/PRIVACY.md";
const termsUrl = "https://github.com/erosson/freecbt/blob/master/TOS.md";

export default function Support() {
  return <LoadModel ready={Ready} />;
}

function Ready({ translate: t }: ModelLoadedProps) {
  return (
    <Screen>
      <SettingsHeader title={t("settings.support.header")} />
      <SettingsCard className="mt-2">
        <Link href={helpCenterUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="help-circle"
            iconColor="yellow"
            label={t("settings.support.help.label")}
          />
        </Link>
        <Link href={issuesUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="message-circle"
            iconColor="pink"
            label={t("settings.support.contact.label")}
            description={t("settings.support.contact.description")}
          />
        </Link>
        <Link href={issuesUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="github"
            iconColor="purple"
            label={t("settings.support.issue.label")}
            description={t("settings.support.issue.description")}
          />
        </Link>
        <Link href={privacyUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="shield"
            iconColor="purple"
            label={t("settings.privacy")}
          />
        </Link>
        <Link href={termsUrl as never} target="_blank" asChild>
          <SettingsRow
            type="nav"
            iconName="file"
            iconColor="purple"
            label={t("settings.terms")}
          />
        </Link>
      </SettingsCard>
    </Screen>
  );
}
