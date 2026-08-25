import { Card, Section, StandardScreen } from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { Button, Typography } from "heroui-native";
import React, { useEffect, useState } from "react";
import { AppState, Image } from "react-native";
import * as ImagePath from "@/src/assets/image-path";
import { useAuthStore } from "./store/useAuthStore";
import { PinEntry } from "./components/PinEntry";

export function AuthGateway(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  const t = useTranslate();
  const hasPin = useAuthStore((state) => state.hasPin);
  const isChecking = useAuthStore((state) => state.isChecking);
  const storageError = useAuthStore((state) => state.storageError);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const checkPinStatus = useAuthStore((state) => state.checkPinStatus);
  const verifyPin = useAuthStore((state) => state.verifyPin);
  const lock = useAuthStore((state) => state.lock);
  const [shake, setShake] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void checkPinStatus();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") lock();
      void checkPinStatus();
    });
    return () => subscription.remove();
  }, [checkPinStatus, lock]);

  async function trySubmit(candidate: string) {
    if (await verifyPin(candidate)) return;
    setShake(true);
    setAttempt((value) => value + 1);
    setTimeout(() => setShake(false), 300);
  }

  if (isChecking) return <></>;
  if (storageError)
    return (
      <StandardScreen>
        <Section className="items-center gap-4">
          <Typography type="h2">
            {t("lock_screen.storage_error_title")}
          </Typography>
          <Typography type="body" color="muted">
            {t("lock_screen.storage_error_body")}
          </Typography>
          <Button onPress={() => void checkPinStatus()}>
            {t("lock_screen.storage_error_retry")}
          </Button>
        </Section>
      </StandardScreen>
    );
  if (!hasPin || isUnlocked) {
    return <>{props.children}</>;
  }

  return (
    <StandardScreen>
      <Section className="items-center gap-4">
        <Image source={ImagePath.logo} className="h-8" resizeMode="contain" />
        <Image
          source={ImagePath.lockIllustration}
          className="h-48 w-48"
          resizeMode="contain"
        />
        <Typography type="h2">{t("lock_screen.gate_title")}</Typography>
        <Typography type="body" color="muted">
          {t("lock_screen.gate_subtitle")}
        </Typography>
        <PinEntry onComplete={trySubmit} shake={shake} resetKey={attempt} />
        {shake && (
          <Typography type="body-sm" className="text-danger">
            {t("lock_screen.wrong_pin")}
          </Typography>
        )}
        <Typography type="body-sm" className="text-accent">
          {t("lock_screen.forgot_pin")}
        </Typography>
        <Card>
          <Typography type="body-xs" color="muted">
            {t("lock_screen.reset_warning")}
          </Typography>
        </Card>
      </Section>
    </StandardScreen>
  );
}
