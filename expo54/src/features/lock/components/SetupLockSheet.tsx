import React, { useState } from "react";
import { View } from "react-native";
import {
  BottomSheet,
  Button,
  Card,
  Icon,
  Typography,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { useAuthStore } from "../store/useAuthStore";
import { PinEntry } from "./PinEntry";

type Step = "intro" | "create" | "confirm";

export function SetupLockSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const t = useTranslate();
  const setPin = useAuthStore((state) => state.setPin);
  const [step, setStep] = useState<Step>("intro");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState<"mismatch" | "storage">();
  const [attempt, setAttempt] = useState(0);

  function close(open: boolean) {
    if (!open) {
      setStep("intro");
      setPinValue("");
      setError(undefined);
      setAttempt(0);
    }
    props.onOpenChange(open);
  }

  function confirm(candidate: string) {
    if (candidate !== pin) {
      setError("mismatch");
      setAttempt((value) => value + 1);
      return;
    }

    void setPin(pin).then(
      () => {
        close(false);
        props.onComplete();
      },
      () => {
        setError("storage");
        setStep("create");
        setAttempt((value) => value + 1);
      },
    );
  }

  const title =
    step === "intro"
      ? t("lock_screen.setup_intro_title")
      : step === "create"
        ? t("lock_screen.setup_create_title")
        : t("lock_screen.setup_confirm_title");

  return (
    <BottomSheet isOpen={props.isOpen} onOpenChange={close}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-5 px-5 pb-8 pt-4">
            <View className="flex-row items-center justify-between">
              <BottomSheet.Title>{title}</BottomSheet.Title>
              <BottomSheet.Close
                testID="lock-setup-close"
                accessibilityLabel={t("lock_screen.close")}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="close" />
              </BottomSheet.Close>
            </View>
            {step === "intro" ? (
              <Card>
                <View className="gap-4">
                  <Typography type="body">
                    {t("lock_screen.setup_intro_body")}
                  </Typography>
                  <View className="flex-row flex-wrap gap-2">
                    {(
                      [
                        "lock_screen.setup_local_only",
                        "lock_screen.setup_no_account",
                        "lock_screen.setup_change_anytime",
                      ] as const
                    ).map((key) => (
                      <View
                        key={key}
                        className="rounded-full border border-separator px-3 py-1"
                      >
                        <Typography type="body-sm">{t(key)}</Typography>
                      </View>
                    ))}
                  </View>
                  <Button
                    title={t("lock_screen.setup_intro_cta")}
                    onPress={() => setStep("create")}
                  />
                </View>
              </Card>
            ) : (
              <View className="items-center gap-5">
                <PinEntry
                  resetKey={`${step}-${attempt}`}
                  shake={Boolean(error)}
                  onComplete={(value) => {
                    if (step === "create") {
                      setPinValue(value);
                      setError(undefined);
                      setStep("confirm");
                    } else {
                      confirm(value);
                    }
                  }}
                />
                {error && (
                  <Typography
                    type="body-sm"
                    className="text-danger"
                    accessibilityRole="alert"
                  >
                    {t(
                      error === "mismatch"
                        ? "lock_screen.setup_mismatch"
                        : "lock_screen.setup_storage_error",
                    )}
                  </Typography>
                )}
              </View>
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
