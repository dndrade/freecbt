import { TranslateFn } from "@/src/i18n/use-i18n";
import { SettingsCard } from "./settings-card";
import { SettingsRow } from "./settings-row";
import { SettingsSheet } from "./settings-sheet";
import { Link } from "expo-router";
import React from "react";

const helpCenterUrl = "https://freecbt.erosson.org/explanation/?ref=settings";
const issuesUrl = "https://github.com/erosson/freecbt/issues";
const privacyUrl = "https://github.com/erosson/freecbt/blob/master/PRIVACY.md";
const termsUrl = "https://github.com/erosson/freecbt/blob/master/TOS.md";

export function SupportSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  translate: TranslateFn;
}) {
  const { isOpen, onOpenChange, translate: t } = props;

  return (
    <SettingsSheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("settings.support.header")}>
      <SettingsCard className="mt-2">
        <Link href={helpCenterUrl as never} target="_blank" asChild>
          <SettingsRow type="nav" iconName="help-circle" iconColor="yellow" label={t("settings.support.help.label")} />
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
          <SettingsRow type="nav" iconName="shield" iconColor="purple" label={t("settings.privacy")} />
        </Link>
        <Link href={termsUrl as never} target="_blank" asChild>
          <SettingsRow type="nav" iconName="file" iconColor="purple" label={t("settings.terms")} />
        </Link>
      </SettingsCard>
    </SettingsSheet>
  );
}
