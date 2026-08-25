import React, { useState } from "react";
import { BottomSheet, Typography } from "@/shared/components";
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
          <BottomSheet.Title>{t("lock_screen.verify_title")}</BottomSheet.Title>
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
