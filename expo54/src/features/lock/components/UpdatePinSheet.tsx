import React, { useState } from "react";
import { View } from "react-native";
import { BottomSheet, Icon, Typography } from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { useAuthStore } from "../store/useAuthStore";
import { PinEntry } from "./PinEntry";

type Step = "current" | "new" | "confirm";

export function UpdatePinSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const t = useTranslate();
  const verifyPin = useAuthStore((state) => state.verifyPin);
  const setPin = useAuthStore((state) => state.setPin);
  const [step, setStep] = useState<Step>("current");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState<"current" | "mismatch" | "storage">();
  const [attempt, setAttempt] = useState(0);
  function close(open: boolean) {
    if (!open) {
      setStep("current");
      setPinValue("");
      setError(undefined);
      setAttempt(0);
    }
    props.onOpenChange(open);
  }
  function complete(value: string) {
    if (step === "current") {
      void verifyPin(value).then((valid) => {
        if (valid) setStep("new");
        else {
          setError("current");
          setAttempt((count) => count + 1);
        }
      });
      return;
    }
    if (step === "new") {
      setPinValue(value);
      setError(undefined);
      setStep("confirm");
      return;
    }
    if (value !== pin) {
      setError("mismatch");
      setStep("new");
      setAttempt((count) => count + 1);
      return;
    }
    void setPin(pin).then(
      () => {
        close(false);
        props.onComplete();
      },
      () => {
        setError("storage");
        setStep("new");
        setAttempt((count) => count + 1);
      },
    );
  }
  const errorKey =
    error === "current"
      ? "lock_screen.update_wrong_current"
      : error === "mismatch"
        ? "lock_screen.update_mismatch"
        : error === "storage"
          ? "lock_screen.update_storage_error"
          : undefined;
  return (
    <BottomSheet isOpen={props.isOpen} onOpenChange={close}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="items-center gap-5 px-5 pb-8 pt-4">
            <View className="w-full flex-row items-center justify-between">
              <BottomSheet.Title>
                {t(`lock_screen.update_${step}_title`)}
              </BottomSheet.Title>
              <BottomSheet.Close
                testID="lock-update-close"
                accessibilityLabel={t("lock_screen.close")}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="close" />
              </BottomSheet.Close>
            </View>
            <PinEntry
              resetKey={`${step}-${attempt}`}
              shake={Boolean(error)}
              onComplete={complete}
            />
            {errorKey && (
              <Typography
                type="body-sm"
                className="text-danger"
                accessibilityRole="alert"
              >
                {t(errorKey)}
              </Typography>
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
