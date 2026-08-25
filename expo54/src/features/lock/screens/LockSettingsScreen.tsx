import {
  Button,
  Card,
  FeatureGate,
  Section,
  StandardScreen,
  Typography,
  useScreenHeader,
} from "@/shared/components";
import { SettingRow } from "@/features/settings/components/SettingRow";
import { useTranslate } from "@/i18n/use-i18n";
import { useFeatureFlagStore } from "@/services";
import * as Routes from "@/src/routes";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { DeviceUnlockSheet } from "../components/DeviceUnlockSheet";
import { SetupLockSheet } from "../components/SetupLockSheet";
import { TurnOffLockSheet } from "../components/TurnOffLockSheet";
import { VerifyPinModal } from "../components/VerifyPinModal";

export function LockSettingsScreen(): React.ReactNode {
  const t = useTranslate();
  const router = useRouter();
  const hasPin = useAuthStore((state) => state.hasPin);
  const deviceUnlockEnabled = useFeatureFlagStore(
    (state) => state.flags.enable_device_unlock,
  );
  const [deviceUnlock, setDeviceUnlock] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [deviceUnlockOpen, setDeviceUnlockOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useScreenHeader({
    title: t("lock_screen.hub_title"),
    rightElement: (
      <View
        accessibilityLabel={t(
          hasPin ? "lock_screen.status_on" : "lock_screen.status_off",
        )}
        className="mr-4 rounded-full border border-separator px-3 py-1"
      >
        <Typography type="body-sm">
          {t(hasPin ? "lock_screen.status_on" : "lock_screen.status_off")}
        </Typography>
      </View>
    ),
  });

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showToast]);

  function setupComplete() {
    if (deviceUnlockEnabled) {
      setDeviceUnlockOpen(true);
    } else {
      setShowToast(true);
    }
  }

  if (!hasPin) {
    return (
      <StandardScreen>
        <Section className="mt-4 gap-5">
          <Card>
            <View className="gap-4">
              <View className="self-start rounded-full border border-separator px-3 py-1">
                <Typography type="body-sm">
                  {t("lock_screen.hub_off_badge")}
                </Typography>
              </View>
              <Typography type="h2">
                {t("lock_screen.hub_off_title")}
              </Typography>
              <Typography type="body" color="muted">
                {t("lock_screen.hub_off_body")}
              </Typography>
              <Button
                title={t("lock_screen.hub_off_cta")}
                onPress={() => setSetupOpen(true)}
              />
            </View>
          </Card>
          <Card>
            <View className="gap-2">
              <Typography type="h3">
                {t("lock_screen.hub_how_it_works_title")}
              </Typography>
              <Typography type="body-sm" color="muted">
                {t("lock_screen.hub_how_it_works_body")}
              </Typography>
            </View>
          </Card>
        </Section>
        <SetupLockSheet
          isOpen={setupOpen}
          onOpenChange={setSetupOpen}
          onComplete={setupComplete}
        />
        <FeatureGate flag="enable_device_unlock">
          <DeviceUnlockSheet
            isOpen={deviceUnlockOpen}
            onOpenChange={setDeviceUnlockOpen}
            enabled={deviceUnlock}
            onEnabledChange={setDeviceUnlock}
            onDone={() => {
              setDeviceUnlockOpen(false);
              setShowToast(true);
            }}
          />
        </FeatureGate>
      </StandardScreen>
    );
  }

  return (
    <StandardScreen>
      <Section className="gap-4 mt-4">
        {showToast && (
          <View
            accessibilityRole="alert"
            className="rounded-2xl border border-separator bg-accent px-4 py-3"
          >
            <Typography type="body">{t("lock_screen.setup_toast")}</Typography>
          </View>
        )}
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
            onValueChange={() => setDeviceUnlockOpen(true)}
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
      <FeatureGate flag="enable_device_unlock">
        <DeviceUnlockSheet
          isOpen={deviceUnlockOpen}
          onOpenChange={setDeviceUnlockOpen}
          enabled={deviceUnlock}
          onEnabledChange={setDeviceUnlock}
          onDone={() => {
            setDeviceUnlockOpen(false);
            setShowToast(true);
          }}
        />
      </FeatureGate>
    </StandardScreen>
  );
}
