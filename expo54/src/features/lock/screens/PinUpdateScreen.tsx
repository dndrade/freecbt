import {
  Section,
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import * as Routes from "@/src/routes";
import { Button, Typography } from "heroui-native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { PinEntry } from "../components/PinEntry";

type Step =
  | { name: "current"; errorAttempt: number }
  | { name: "new"; error?: "mismatch" | "storage"; errorAttempt: number }
  | { name: "confirm"; code: string }
  | { name: "done" };

export function PinUpdateScreen(): React.ReactNode {
  const t = useTranslate();
  const router = useRouter();
  const verifyPin = useAuthStore((state) => state.verifyPin);
  const setPin = useAuthStore((state) => state.setPin);
  const [step, setStep] = useState<Step>({ name: "current", errorAttempt: 0 });

  function onCurrentComplete(candidate: string) {
    void verifyPin(candidate).then((ok) => {
      if (ok) {
        setStep({ name: "new", errorAttempt: 0 });
      } else {
        setStep((current) =>
          current.name === "current"
            ? { name: "current", errorAttempt: current.errorAttempt + 1 }
            : current,
        );
      }
    });
  }

  function onConfirmComplete(candidate: string) {
    if (step.name !== "confirm") return;
    if (candidate !== step.code) {
      setStep({ name: "new", error: "mismatch", errorAttempt: 1 });
      return;
    }
    void setPin(step.code).then(
      () => setStep({ name: "done" }),
      () => setStep({ name: "new", error: "storage", errorAttempt: 1 }),
    );
  }

  const back = () => router.back();
  if (step.name === "done") {
    return (
      <StandardScreen>
        <Section className="items-center gap-4">
          <Typography type="h2">
            {t("lock_screen.update_success_title")}
          </Typography>
          <Button onPress={() => router.replace(Routes.settingsV2())}>
            {t("lock_screen.update_success_cta")}
          </Button>
        </Section>
      </StandardScreen>
    );
  }
  if (step.name === "current") {
    return (
      <PinStep
        header={t("lock_screen.update_current_title")}
        error={
          step.errorAttempt ? t("lock_screen.update_wrong_current") : undefined
        }
        resetKey={`current-${step.errorAttempt}`}
        onComplete={onCurrentComplete}
        onBack={back}
      />
    );
  }
  if (step.name === "new") {
    const error =
      step.error === "storage"
        ? t("lock_screen.update_storage_error")
        : step.error
          ? t("lock_screen.update_mismatch")
          : undefined;
    return (
      <PinStep
        header={t("lock_screen.update_new_title")}
        error={error}
        resetKey={`new-${step.errorAttempt}`}
        onComplete={(code) => setStep({ name: "confirm", code })}
        onBack={back}
      />
    );
  }
  return (
    <PinStep
      header={t("lock_screen.update_confirm_title")}
      onComplete={onConfirmComplete}
      onBack={back}
    />
  );
}

function PinStep(props: {
  header: string;
  error?: string;
  resetKey?: string;
  onComplete: (code: string) => void;
  onBack: () => void;
}) {
  useScreenHeader({
    title: props.header,
    leftAction: backHeaderAction(props.onBack),
  });
  return (
    <StandardScreen>
      <Section className="items-center gap-4 mt-6">
        <PinEntry
          onComplete={props.onComplete}
          shake={Boolean(props.error)}
          resetKey={props.resetKey}
        />
        {props.error && (
          <Typography type="body-sm" className="text-danger">
            {props.error}
          </Typography>
        )}
      </Section>
    </StandardScreen>
  );
}
