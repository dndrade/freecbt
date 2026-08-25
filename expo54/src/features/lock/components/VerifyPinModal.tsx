import React, { useState } from "react";
import { View } from "react-native";
import { BottomSheet, Icon, Typography } from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { PinEntry } from "./PinEntry";
import { useAuthStore } from "../store/useAuthStore";

export function VerifyPinModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslate();
  const verifyPin = useAuthStore((state) => state.verifyPin);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="flex-row items-center justify-between px-5 pt-4">
            <BottomSheet.Title>
              {t("lock_screen.verify_title")}
            </BottomSheet.Title>
            <BottomSheet.Close
              testID="lock-verify-close"
              accessibilityLabel={t("lock_screen.close")}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="close" />
            </BottomSheet.Close>
          </View>
          <BottomSheet.Description>
            {t("lock_screen.verify_body")}
          </BottomSheet.Description>
          <PinEntry
            resetKey={attempt}
            shake={result === "error"}
            onComplete={(pin) =>
              void verifyPin(pin).then((ok) => {
                setResult(ok ? "success" : "error");
                setAttempt((value) => value + 1);
              })
            }
          />
          {result !== "idle" && (
            <Typography type="body-sm" accessibilityRole="alert">
              {t(
                result === "success"
                  ? "lock_screen.verify_success"
                  : "lock_screen.verify_error",
              )}
            </Typography>
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
