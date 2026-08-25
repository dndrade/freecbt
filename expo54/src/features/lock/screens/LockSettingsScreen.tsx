import {
  Button,
  Card,
  FeatureGate,
  Section,
  StandardScreen,
  Typography,
} from "@/shared/components";
import { SettingRow } from "@/features/settings/components/SettingRow";
import { useTranslate } from "@/i18n/use-i18n";
import * as Routes from "@/src/routes";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { TurnOffLockSheet } from "../components/TurnOffLockSheet";
import { VerifyPinModal } from "../components/VerifyPinModal";

export function LockSettingsScreen(): React.ReactNode {
  const t = useTranslate();
  const router = useRouter();
  const hasPin = useAuthStore((state) => state.hasPin);
  const [deviceUnlock, setDeviceUnlock] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [turnOffOpen, setTurnOffOpen] = useState(false);

  if (!hasPin) {
    return (
      <StandardScreen>
        <Section className="items-center gap-4">
          <Typography type="h2">{t("lock_screen.hub_off_title")}</Typography>
          <Typography type="body" color="muted">
            {t("lock_screen.hub_off_body")}
          </Typography>
          <Button
            title={t("lock_screen.hub_off_cta")}
            onPress={() => router.push(Routes.lockSetupV2())}
          />
        </Section>
      </StandardScreen>
    );
  }

  return (
    <StandardScreen>
      <Section className="gap-4 mt-4">
        <Card>
          <Typography type="body">{t("lock_screen.hub_on_title")}</Typography>
        </Card>
        <SettingRow
          type="nav"
          icon="lock"
          label={t("lock_screen.hub_change_pin")}
          onPress={() => router.push(Routes.lockUpdateV2())}
        />
        <FeatureGate flag="enable_device_unlock">
          <SettingRow
            type="toggle"
            icon="shield"
            label={t("lock_screen.hub_device_unlock")}
            value={deviceUnlock}
            onValueChange={setDeviceUnlock}
          />
        </FeatureGate>
        <SettingRow
          type="nav"
          icon="shield"
          label={t("lock_screen.hub_verify_pin")}
          onPress={() => setVerifyOpen(true)}
        />
        <SettingRow
          type="nav"
          icon="lock"
          label={t("lock_screen.hub_turn_off")}
          onPress={() => setTurnOffOpen(true)}
        />
      </Section>
      <VerifyPinModal isOpen={verifyOpen} onOpenChange={setVerifyOpen} />
      <TurnOffLockSheet isOpen={turnOffOpen} onOpenChange={setTurnOffOpen} />
    </StandardScreen>
  );
}
