import * as Routes from "@/src/routes";
import { localeTags, type LocaleTag, type TranslateFn } from "@/src/i18n/use-i18n";
import type { Reminders } from "@/src/features/reminders/use-reminders";
import { Action, type Model } from "@/src/model";
import type { Href } from "expo-router";
import { Linking } from "react-native";
import type { SettingsPanelItem } from "./ui/settings-panel";

const helpCenterUrl = "https://freecbt.erosson.org/explanation/?ref=settings";
const issuesUrl = "https://github.com/erosson/freecbt/issues";
const contactUrl = "mailto:freecbt@erosson.org";
const privacyUrl = "https://github.com/erosson/freecbt/blob/master/PRIVACY.md";
const termsUrl = "https://github.com/erosson/freecbt/blob/master/TOS.md";
const sourceUrl = "https://github.com/erosson/freecbt";

type DismissThenNavigate = (href: Href) => void;

export function buildGeneralRootItems(args: {
  model: Model.Ready;
  reminders: Reminders;
  dispatch: (a: Action.Action) => void;
  translate: TranslateFn;
  dismissThenNavigate: DismissThenNavigate;
  onOpenLanguage: () => void;
}): readonly SettingsPanelItem[] {
  const { model, reminders, dispatch, translate: t, dismissThenNavigate, onOpenLanguage } = args;
  const localeOptions: readonly { value: LocaleTag | ""; label: string }[] = [
    { value: "", label: t("settings.locale.default") },
    ...localeTags
      .filter((locale) => !locale.startsWith("_"))
      .map((locale) => ({ value: locale, label: t(`settings.locale.list.${locale}`) })),
  ];
  const currentLocale =
    localeOptions.find((o) => o.value === (model.settings.locale ?? "")) ?? localeOptions[0]!;

  return [
    {
      id: "reminders",
      type: "toggle",
      iconName: "bell",
      label: t("settings.general.notifications.label"),
      isSelected: model.settings.reminders,
      onSelectedChange: (v) => {
        void reminders.set(v, dispatch, t);
      },
    },
    {
      id: "lock",
      type: "nav",
      iconName: "lock",
      label: t("settings.general.applock.label"),
      description: model.settings.pincode
        ? t("settings.pincode.button.update")
        : t("settings.general.applock.description"),
      onPress: () => dismissThenNavigate(Routes.lockUpdateV2()),
    },
    {
      id: "language",
      type: "value",
      iconName: "globe",
      label: t("settings.general.language.label"),
      value: currentLocale.label,
      onPress: onOpenLanguage,
    },
  ];
}

export function buildDataPanelItems(args: {
  translate: TranslateFn;
  dismissThenNavigate: DismissThenNavigate;
}): readonly SettingsPanelItem[] {
  const { translate: t, dismissThenNavigate } = args;

  return [
    {
      id: "backup",
      type: "nav",
      iconName: "hard-drive",
      label: t("settings.data.backup.label"),
      description: t("settings.data.backup.description"),
      onPress: () => dismissThenNavigate(Routes.backupV2()),
    },
    {
      id: "export",
      type: "nav",
      iconName: "file-text",
      label: t("settings.data.export.label"),
      description: t("settings.data.export.description"),
      onPress: () => dismissThenNavigate(Routes.exportV2()),
    },
  ];
}

export function buildWellbeingPanelItems(args: {
  translate: TranslateFn;
  dismissThenNavigate: DismissThenNavigate;
  onOpenCrisis: () => void;
}): readonly SettingsPanelItem[] {
  const { translate: t, dismissThenNavigate, onOpenCrisis } = args;
  return [
    {
      id: "learn",
      type: "nav",
      iconName: "book-open",
      label: t("settings.wellbeing.learn.label"),
      description: t("settings.wellbeing.learn.description"),
      onPress: () => dismissThenNavigate(Routes.introV2()),
    },
    {
      id: "crisis",
      type: "nav",
      iconName: "phone",
      label: t("settings.wellbeing.crisis.label"),
      description: t("settings.wellbeing.crisis.description"),
      onPress: onOpenCrisis,
    },
  ];
}

export function buildSupportPanelItems(t: TranslateFn): readonly SettingsPanelItem[] {
  return [
    {
      id: "help",
      type: "nav",
      iconName: "help-circle",
      label: t("settings.support.help.label"),
      onPress: () => void Linking.openURL(helpCenterUrl),
    },
    {
      id: "contact",
      type: "nav",
      iconName: "message-circle",
      label: t("settings.support.contact.label"),
      description: t("settings.support.contact.description"),
      onPress: () => void Linking.openURL(contactUrl),
    },
    {
      id: "issue",
      type: "nav",
      iconName: "github",
      label: t("settings.support.issue.label"),
      description: t("settings.support.issue.description"),
      onPress: () => void Linking.openURL(issuesUrl),
    },
    {
      id: "privacy",
      type: "nav",
      iconName: "shield",
      label: t("settings.privacy"),
      onPress: () => void Linking.openURL(privacyUrl),
    },
    {
      id: "terms",
      type: "nav",
      iconName: "file",
      label: t("settings.terms"),
      onPress: () => void Linking.openURL(termsUrl),
    },
  ];
}

export function buildAboutPanelItems(args: {
  translate: TranslateFn;
  version: string;
  onOpenAcknowledgements: () => void;
  onTapVersion: () => void;
}): readonly SettingsPanelItem[] {
  const { translate: t, version, onOpenAcknowledgements, onTapVersion } = args;

  return [
    {
      id: "version",
      type: "collapsed",
      iconName: "info",
      description: t("settings.about.version", { version }),
      onPress: onTapVersion,
    },
    {
      id: "source",
      type: "nav",
      iconName: "github",
      label: t("settings.about.source.label"),
      onPress: () => void Linking.openURL(sourceUrl),
    },
    {
      id: "acknowledgements",
      type: "nav",
      iconName: "heart",
      label: t("settings.about.acknowledgements.label"),
      onPress: onOpenAcknowledgements,
    },
  ];
}
