import React, { useState } from "react";
import { View } from "react-native";
import { BottomSheet, Icon, Typography } from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { PinEntry } from "./PinEntry";
import { useAuthStore } from "../store/useAuthStore";

export function TurnOffLockSheet({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslate();
  const verifyPin = useAuthStore((state) => state.verifyPin);
  const removePin = useAuthStore((state) => state.removePin);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  async function confirm(pin: string) {
    if (await verifyPin(pin)) {
      try {
        await removePin();
        onOpenChange(false);
      } catch {
        setError(true);
        setAttempt((value) => value + 1);
      }
    } else {
      setError(true);
      setAttempt((value) => value + 1);
    }
  }
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="flex-row items-center justify-between px-5 pt-4">
            <BottomSheet.Title>
              {t("lock_screen.turn_off_title")}
            </BottomSheet.Title>
            <BottomSheet.Close
              testID="lock-turn-off-close"
              accessibilityLabel={t("lock_screen.close")}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="close" />
            </BottomSheet.Close>
          </View>
          <BottomSheet.Description>
            {t("lock_screen.turn_off_body")}
          </BottomSheet.Description>
          <PinEntry
            resetKey={attempt}
            shake={error}
            onComplete={(pin) => void confirm(pin)}
          />
          {error && (
            <Typography type="body-sm" accessibilityRole="alert">
              {t("lock_screen.turn_off_verify_error")}
            </Typography>
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
