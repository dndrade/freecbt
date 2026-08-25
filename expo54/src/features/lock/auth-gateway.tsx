import { Card, Section, StandardScreen } from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { Button, Typography } from "heroui-native";
import React, { useEffect, useState } from "react";
import { AppState, Image } from "react-native";
import * as ImagePath from "@/src/assets/image-path";
import { migrateLegacyPinIfNeeded } from "./services/legacyPinMigration";
import { getPin } from "./services/pinStorage";
import { useAuthStore } from "./store/useAuthStore";
import { PinInput } from "./ui/pin-input";

export function AuthGateway(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  const t = useTranslate();
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const unlock = useAuthStore((state) => state.unlock);
  const lock = useAuthStore((state) => state.lock);
  const [pin, setPin] = useState<string | null | undefined>(undefined);
  const [value, setValue] = useState<string>("");

  function trySubmit(candidate: string) {
    setValue("");
    if (candidate === pin) unlock();
  }

  useEffect(() => {
    const refresh = () => {
      void migrateLegacyPinIfNeeded()
        .then(getPin)
        .then(setPin, () => setPin(undefined));
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") lock();
      refresh();
    });
    return () => subscription.remove();
  }, [lock]);

  if (pin === undefined) return <></>;
  if (pin === null || isUnlocked) {
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
        <PinInput
          value={value}
          onChange={(v) => setValue(v.replace(/[^0-9]/g, ""))}
          onComplete={trySubmit}
          autoFocus
        />
        <Button onPress={() => trySubmit(value)}>
          {t("lock_screen.unlock_button")}
        </Button>
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
