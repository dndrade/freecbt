import { Screen } from "@/src/components";
import { TopBar } from "@/src/components/layout/top-bar";
import { useReminders } from "@/src/features/reminders/use-reminders";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import * as Routes from "@/src/routes";
import Constants from "expo-constants";
import { Typography } from "heroui-native";
import React, { useState } from "react";
import { AppearancePicker } from "./ui/appearance-picker";
import { JournalPicker } from "./ui/journal-picker";
import { LanguagePickerContent } from "./ui/language-picker";
import { SettingsPanel } from "./ui/settings-panel";
import {
  buildAboutPanelItems,
  buildDataPanelItems,
  buildGeneralRootItems,
  buildSupportPanelItems,
  buildWellbeingPanelItems,
} from "./settings-panels";
import { SettingsCard } from "./ui/settings-card";
import { SettingsRow } from "./ui/settings-row";
import { SettingsSheet, useDismissThenNavigate, useResetOnDismiss } from "./ui/settings-sheet";

type OpenPanel = "general" | "appearance" | "journal" | "data" | "wellbeing" | "support" | "about" | null;
type GeneralView = "root" | "language";

export function SettingsScreen(props: ModelLoadedProps) {
  const { model, dispatch, translate: t } = props;
  const [open, setOpen] = useState<OpenPanel>(null);
  const [generalView, setGeneralView] = useState<GeneralView>("root");
  const [showCrisisTodo, setShowCrisisTodo] = useState(false);
  const [showAcknowledgementsTodo, setShowAcknowledgementsTodo] = useState(false);
  const [versionPresses, setVersionPresses] = useState(0);
  const reminders = useReminders();
  const { dismissThenNavigate, onClosed } = useDismissThenNavigate(() => setOpen(null));
  const version = Constants.expoConfig?.version ?? "unknown";
  const isDebugVisible = versionPresses > 0 && versionPresses % 5 === 0;

  useResetOnDismiss(open === "general", () => setGeneralView("root"));
  useResetOnDismiss(open === "wellbeing", () => setShowCrisisTodo(false));
  useResetOnDismiss(open === "about", () => {
    setVersionPresses(0);
    setShowAcknowledgementsTodo(false);
  });

  function panel(key: Exclude<OpenPanel, null>) {
    return {
      isOpen: open === key,
      onOpenChange: (v: boolean) => setOpen(v ? key : null),
    };
  }

  return (
    <Screen>
      <TopBar title={t("settings.header")} />
      <SettingsCard className="mt-2">
        <SettingsRow
          type="nav"
          iconName="settings"
          label={t("settings.hub.general.label")}
          onPress={() => setOpen("general")}
        />
        <SettingsRow
          type="nav"
          iconName="moon"
          label={t("settings.hub.appearance.label")}
          onPress={() => setOpen("appearance")}
        />
        <SettingsRow
          type="nav"
          iconName="tag"
          label={t("settings.hub.journal.label")}
          onPress={() => setOpen("journal")}
        />
        <SettingsRow
          type="nav"
          iconName="database"
          label={t("settings.hub.data.label")}
          description={t("settings.hub.data.description")}
          onPress={() => setOpen("data")}
        />
        <SettingsRow
          type="nav"
          iconName="heart"
          label={t("settings.hub.wellbeing.label")}
          description={t("settings.hub.wellbeing.description")}
          onPress={() => setOpen("wellbeing")}
        />
        <SettingsRow
          type="nav"
          iconName="headphones"
          label={t("settings.hub.support.label")}
          description={t("settings.hub.support.description")}
          onPress={() => setOpen("support")}
        />
        <SettingsRow
          type="nav"
          iconName="info"
          label={t("settings.hub.about.label")}
          onPress={() => setOpen("about")}
        />
      </SettingsCard>

      <SettingsSheet
        {...panel("general")}
        onClosed={onClosed}
        title={
          generalView === "root" ? t("settings.general.header") : t("settings.general.language.label")
        }
      >
        {generalView === "root" ? (
          <SettingsCard className="mt-2">
            {buildGeneralRootItems({
              model,
              reminders,
              dispatch,
              translate: t,
              dismissThenNavigate,
              onOpenLanguage: () => setGeneralView("language"),
            }).map(({ id, ...row }) => (
              <React.Fragment key={id}>
                <SettingsRow {...row} />
              </React.Fragment>
            ))}
          </SettingsCard>
        ) : (
          <LanguagePickerContent
            model={model}
            dispatch={dispatch}
            translate={t}
            onBack={() => setGeneralView("root")}
          />
        )}
      </SettingsSheet>
      <AppearancePicker {...panel("appearance")} model={model} dispatch={dispatch} translate={t} />
      <JournalPicker {...panel("journal")} model={model} dispatch={dispatch} translate={t} />
      <SettingsPanel
        {...panel("data")}
        onClosed={onClosed}
        title={t("settings.data.header")}
        items={buildDataPanelItems({ translate: t, dismissThenNavigate })}
      />
      <SettingsPanel
        {...panel("wellbeing")}
        onClosed={onClosed}
        title={t("settings.wellbeing.header")}
        items={buildWellbeingPanelItems({
          translate: t,
          dismissThenNavigate,
          onOpenCrisis: () => setShowCrisisTodo(true),
        })}
        footer={
          showCrisisTodo ? (
            <Typography type="body-sm" color="muted" className="mt-3 px-2">
              {t("settings.wellbeing.crisis.todo")}
            </Typography>
          ) : null
        }
      />
      <SettingsPanel
        {...panel("support")}
        onClosed={onClosed}
        title={t("settings.support.header")}
        items={buildSupportPanelItems(t)}
      />
      <SettingsPanel
        {...panel("about")}
        onClosed={onClosed}
        title={t("settings.about.header")}
        items={buildAboutPanelItems({
          translate: t,
          version,
          onTapVersion: () => setVersionPresses((presses) => presses + 1),
          onOpenAcknowledgements: () => setShowAcknowledgementsTodo(true),
        })}
        footer={
          <>
            {showAcknowledgementsTodo ? (
              <Typography type="body-sm" color="muted" className="mt-3 px-2">
                {t("settings.about.acknowledgements.todo")}
              </Typography>
            ) : null}
            {isDebugVisible ? (
              <SettingsRow
                type="nav"
                iconName="terminal"
                label="developer debug page"
                className="mt-3"
                onPress={() => dismissThenNavigate(Routes.debugV2())}
              />
            ) : null}
          </>
        }
      />
    </Screen>
  );
}
